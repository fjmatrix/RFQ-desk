import {
  HEADER_FIELD_DEFS,
  LINE_FIELD_DEFS,
  PRODUCT_FIELD_DEFS,
} from "../fields";
import type { FieldDef } from "../fields";
import type { Vendor } from "../types";
import { matchProduct, type RfqLine } from "./rfq";
import { findSource, quoteLine } from "./source";

export type FieldPath = { productId?: string; lineId?: string; field: string };

export type Issue = {
  id: string;
  group: "fix" | "verify" | "ask";
  label: string;
  targets: FieldPath[];
  source?: string;
  apply?: { path: FieldPath; value: unknown }[];
  question?: string;
};

export const pathKey = (path: FieldPath) =>
  [path.productId, path.lineId, path.field].filter(Boolean).join(".");

function isEmpty(value: unknown): boolean {
  return value === null || value === "" || value === undefined;
}

function missingFields<T extends object>(
  value: T,
  defs: readonly FieldDef<T>[],
) {
  return defs.filter((def) => def.required && isEmpty(value[def.field]));
}

export function findIssues(vendor: Vendor, rfq: RfqLine[]): Issue[] {
  const issues: Issue[] = [];
  const missingHeader = missingFields(vendor, HEADER_FIELD_DEFS);
  if (missingHeader.length) {
    issues.push({
      id: "fix:header",
      group: "fix",
      label: `Quote header: ${missingHeader.map((def) => def.header.toLowerCase()).join(", ")} missing`,
      targets: missingHeader.map((def) => ({ field: def.field })),
    });
  }

  const rejected = new Set<string>(); // rejected alternates and extras no longer cover their RFQ line

  for (const product of vendor.products) {
    const productId = product.id;
    const name =
      product.partNumber ||
      (product.nsn ? `NSN ${product.nsn}` : "Unnamed product");
    const { requested, decisionId } = matchProduct(product, rfq);
    const source = findSource(vendor, product.partNumber);
    if (decisionId) {
      const decision = vendor.review?.decisions[decisionId];
      if (decision === "reject") {
        rejected.add(productId);
        continue;
      }
      if (!decision) {
        issues.push({
          id: decisionId,
          group: "fix",
          label: requested
            ? `${name}: alternate for ${requested.pn}, accept or reject`
            : `${name}: extra product, accept or reject`,
          targets: [{ productId, field: "partNumber" }],
          source,
        });
      }
    }

    const missingProduct = missingFields(product, PRODUCT_FIELD_DEFS);
    if (missingProduct.length) {
      issues.push({
        id: `fix:product:${productId}`,
        group: "fix",
        label: `${name}: ${missingProduct.map((def) => def.header.toLowerCase()).join(", ")} missing`,
        targets: missingProduct.map((def) => ({ productId, field: def.field })),
        source,
      });
    }

    if (requested && product.nsn && product.nsn !== requested.nsn) {
      issues.push({
        id: `verify:nsn:${productId}`,
        group: "verify",
        label: `${name}: NSN ${product.nsn} differs from RFQ NSN ${requested.nsn}`,
        targets: [{ productId, field: "nsn" }],
        source: requested.source,
      });
    }

    if (!product.lines.length) {
      if (/\bsuperseded\b/i.test(product.additionalNotes)) {
        const question = `What replaces the superseded ${name}?`;
        issues.push({
          id: `ask:superseded:${productId}`,
          group: "ask",
          label: `${name}: superseded, replacement PN needed`,
          targets: [{ productId, field: "additionalNotes" }],
          source,
          question,
        });
      }
      continue;
    }

    const quoted = product.lines.filter((line) => line.isQuoting !== false);
    for (const line of quoted) {
      const missingLine = missingFields(line, LINE_FIELD_DEFS);
      if (missingLine.length) {
        const targets = missingLine.map((def) => ({
          productId,
          lineId: line.id,
          field: def.field,
        }));
        // When the vendor's own line states the value ("qty 100: USD 1.74 ea / 174.00 ext / 18d"), Enter applies it.
        const stated =
          source && line.quantity !== null
            ? quoteLine(source, line.quantity)
            : undefined;
        const apply = stated
          ? targets
              .filter((path) => path.field in stated)
              .map((path) => ({ path, value: stated[path.field] }))
          : [];
        issues.push({
          id: `fix:${line.id}`,
          group: "fix",
          label: `${name} @${line.quantity ?? "—"}: ${missingLine.map((def) => def.header.toLowerCase()).join(", ")} missing`,
          targets,
          source,
          apply: apply.length ? apply : undefined,
        });
      }
      if (
        requested &&
        line.quantity !== null &&
        !requested.breaks.includes(line.quantity)
      ) {
        issues.push({
          id: `verify:quantity:${line.id}`,
          group: "verify",
          label: `${name}: quoted qty ${line.quantity} not requested in RFQ (requested: ${requested.breaks.join(", ")})`,
          targets: [{ productId, lineId: line.id, field: "quantity" }],
          source: requested.source,
        });
      }
    }

    if (requested) {
      const missingBreaks = requested.breaks.filter(
        (quantity) => !quoted.some((line) => line.quantity === quantity),
      );
      if (missingBreaks.length) {
        issues.push({
          id: `fix:breaks:${productId}`,
          group: "fix",
          label: `${name}: requested qty breaks ${missingBreaks.join(", ")} not quoted`,
          targets: missingBreaks.map((quantity) => ({
            productId,
            field: `break:${quantity}`,
          })),
          source,
          question: `Can you quote ${name} at quantities ${missingBreaks.join(", ")}?`,
        });
      }
    }

    const missingDetails = PRODUCT_FIELD_DEFS.filter(
      (def) =>
        [
          "coo",
          "mfrCage",
          "certifications",
          "packagingIncluded",
          "shippingIncluded",
          "hazmatItem",
        ].includes(def.field) && isEmpty(product[def.field]),
    );
    if (missingDetails.length) {
      const names = missingDetails.map((def) => def.header).join(", ");
      issues.push({
        id: `ask:details:${productId}`,
        group: "ask",
        label: `${name}: ${names} missing`,
        targets: missingDetails.map((def) => ({ productId, field: def.field })),
        source,
        question: `Please provide ${names} for ${name}.`,
      });
    }
  }

  for (const line of rfq) {
    const offered = vendor.products.filter(
      (product) => product.partNumber === line.pn || product.nsn === line.nsn,
    );
    if (offered.some((product) => !rejected.has(product.id))) continue;
    issues.push({
      id: `fix:missing:${line.pn}`,
      group: "fix",
      label: offered.length
        ? `${line.pn}: alternate rejected, requested part not quoted`
        : `${line.pn}: requested part missing from the quote`,
      targets: [],
      question: `Can you provide a quote for ${line.pn}?`,
    });
  }

  return issues.filter(
    (issue) =>
      issue.group !== "verify" ||
      vendor.review?.decisions[issue.id] !== "accept",
  );
}

export function draftFollowUp(vendor: Vendor, issues: Issue[]): string {
  const questions = issues
    .filter((issue) => issue.question)
    .map((issue) => `- ${issue.question}`)
    .join("\n");

  return [
    `Hi ${vendor.contactName.split(" ")[0]},`,
    "Thanks for the quote.",
    questions,
    "Thanks,",
  ]
    .filter(Boolean)
    .join("\n\n");
}
