import assert from "node:assert/strict";
import { test } from "node:test";

import data from "../../data/vq-data.json";
import type { Vendor } from "../types";
import { applyIssue, decideIssue } from "./actions";
import { fieldState, markEdits } from "./field-state";
import { findIssues, pathKey, type Issue } from "./issues";
import { matchProduct, orderProducts, parseRfq } from "./rfq";
import { findSource } from "./source";

const seedVendor = (index = 0): Vendor => structuredClone(data.vendors[index]);
const issuesFor = (vendor: Vendor) =>
  findIssues(vendor, parseRfq(vendor.emails[0].body));

test("seed vendors have the expected Fix, Verify, and Ask counts", () => {
  const expected = [
    [8, 0, 0],
    [7, 1, 0],
    [8, 0, 2],
  ];
  for (const [index, counts] of expected.entries()) {
    const vendor = seedVendor(index);
    assert.equal(parseRfq(vendor.emails[0].body).length, 10);
    const issues = issuesFor(vendor);
    assert.deepEqual(
      ["fix", "verify", "ask"].map(
        (group) => issues.filter((issue) => issue.group === group).length,
      ),
      counts,
    );
  }
});

test("Apply fills missing values from the quote without mutating the vendor", () => {
  const vendor = seedVendor();
  const before = structuredClone(vendor);
  const line = vendor.products[0].lines[0];
  const issue = issuesFor(vendor).find((item) => item.id === `fix:${line.id}`);
  assert.ok(issue);
  const updated = applyIssue(vendor, issue);
  assert.deepEqual(vendor, before);
  assert.deepEqual(updated.products[0].lines[0], {
    ...line,
    unitCost: 1.74,
    price: 174,
    currency: "USD",
    leadTime: 18,
  });
  assert.equal(
    issuesFor(updated).some((item) => item.id === issue.id),
    false,
  );
});

test("Apply preserves populated values while correcting a missing unit cost", () => {
  const vendor = seedVendor();
  vendor.products[0].lines[0].price = 200;
  const issue = issuesFor(vendor).find(
    (item) => item.id === `fix:${vendor.products[0].lines[0].id}`,
  );
  assert.ok(issue);
  const line = applyIssue(vendor, issue).products[0].lines[0];
  assert.equal(line.unitCost, 1.74);
  assert.equal(line.price, 200);
});

test("Reject excludes an alternate and raises a Fix for the requested part", () => {
  const vendor = seedVendor();
  const issue = issuesFor(vendor).find((item) => item.id.startsWith("alt:"));
  assert.ok(issue);
  const updated = decideIssue(vendor, issue.id, "reject");
  const issues = issuesFor(updated);
  assert.equal(vendor.review, undefined);
  assert.equal(
    issues.some((item) => item.id === issue.id),
    false,
  );
  assert.ok(issues.some((item) => item.id === "fix:missing:NAS1149F0832P"));
  assert.deepEqual(updated.products, vendor.products);
});

test("a missing requested part belongs to Fix and keeps its vendor question", () => {
  const vendor = seedVendor();
  const product = vendor.products.shift()!;
  const issue = issuesFor(vendor).find(
    (item) => item.id === `fix:missing:${product.partNumber}`,
  );
  assert.ok(issue);
  assert.equal(issue.group, "fix");
  assert.deepEqual(issue.targets, []);
  assert.equal(
    issue.question,
    `Can you provide a quote for ${product.partNumber}?`,
  );
});

test("missing requested quantity breaks belong to Fix", () => {
  const vendor = seedVendor();
  const product = vendor.products[0];
  const issue = issuesFor(vendor).find(
    (item) => item.id === `fix:breaks:${product.id}`,
  );
  assert.ok(issue);
  assert.equal(issue.group, "fix");
  assert.deepEqual(issue.targets, [
    { productId: product.id, field: "break:250" },
  ]);
  assert.equal(
    issue.question,
    `Can you quote ${product.partNumber} at quantities 250?`,
  );
});

test("missing optional details and superseded replacements remain Ask", () => {
  const issues = issuesFor(seedVendor(2));
  const details = issues.find((item) => item.id.startsWith("ask:details:"));
  const superseded = issues.find((item) =>
    item.id.startsWith("ask:superseded:"),
  );
  assert.ok(details);
  assert.equal(details.group, "ask");
  assert.ok(details.targets.some((path) => path.field === "coo"));
  assert.ok(superseded);
  assert.equal(superseded.group, "ask");
  assert.equal(superseded.question, "What replaces the superseded AN960-10?");
});

test("Reject removes an extra's remaining issues; Accept resolves a decision", () => {
  const vendor = seedVendor();
  const extra = issuesFor(vendor).find((item) => item.id.startsWith("extra:"));
  assert.ok(extra);
  const rejected = issuesFor(decideIssue(vendor, extra.id, "reject"));
  assert.equal(
    rejected.some((item) =>
      item.targets.some(
        (path) => path.productId === extra.targets[0].productId,
      ),
    ),
    false,
  );
  const accepted = issuesFor(decideIssue(vendor, extra.id, "accept"));
  assert.equal(
    accepted.some((item) => item.id === extra.id),
    false,
  );
});

test("matchProduct labels requested parts, alternates, and extras", () => {
  const vendor = seedVendor();
  const rfq = parseRfq(vendor.emails[0].body);
  const roleOf = (pn: string) => {
    const product = vendor.products.find((item) => item.partNumber === pn);
    assert.ok(product);
    const { requested, role, decisionId } = matchProduct(product, rfq);
    return { requested: requested?.pn, role, decisionId };
  };
  const alternate = vendor.products.find(
    (item) => item.partNumber === "NAS1149F0832P-ALT",
  )!;
  const extra = vendor.products.find(
    (item) => item.partNumber === "MS24665-283",
  )!;

  assert.deepEqual(roleOf("MS27039-1-08"), {
    requested: "MS27039-1-08",
    role: "requested",
    decisionId: undefined,
  });
  assert.deepEqual(roleOf("NAS1149F0832P-ALT"), {
    requested: "NAS1149F0832P",
    role: "alternate",
    decisionId: `alt:${alternate.id}`,
  });
  assert.deepEqual(roleOf("MS24665-283"), {
    requested: undefined,
    role: "extra",
    decisionId: `extra:${extra.id}`,
  });
  // The queue raises exactly these decisions.
  assert.deepEqual(
    issuesFor(vendor)
      .filter((issue) => /^(alt|extra):/.test(issue.id))
      .map((issue) => issue.id),
    [`alt:${alternate.id}`, `extra:${extra.id}`],
  );

  // A blank PN found by NSN is a missing value, not an alternate.
  alternate.partNumber = "";
  assert.deepEqual(matchProduct(alternate, rfq), {
    requested: rfq.find((line) => line.pn === "NAS1149F0832P"),
    role: "requested",
    decisionId: undefined,
  });
});

test("Undo clears a decision and returns the alternate to the queue", () => {
  const vendor = seedVendor();
  const issue = issuesFor(vendor).find((item) => item.id.startsWith("alt:"));
  assert.ok(issue);
  const rejected = decideIssue(vendor, issue.id, "reject");
  assert.ok(
    issuesFor(rejected).some((item) => item.id === "fix:missing:NAS1149F0832P"),
  );
  const undone = decideIssue(rejected, issue.id, null);
  assert.deepEqual(undone.review?.decisions, {});
  assert.deepEqual(
    issuesFor(undone).map((item) => item.id),
    issuesFor(vendor).map((item) => item.id),
  );
});

test("orderProducts puts alternates in their RFQ slot and extras last", () => {
  const vendor = seedVendor(1);
  const rfq = parseRfq(vendor.emails[0].body);
  const shuffled = [...vendor.products].reverse();
  const ordered = orderProducts(shuffled, rfq).map(
    ({ product }) => product.partNumber,
  );
  assert.equal(ordered.at(-1), "NAS1149F0332P");
  assert.equal(ordered.indexOf("MS35206-228-AC"), 5);
  assert.deepEqual(
    ordered.slice(0, -1),
    rfq.map((line) => (line.pn === "MS35206-228" ? "MS35206-228-AC" : line.pn)),
  );
});

test("Keep hides a Verify item and preserves existing decisions", () => {
  const vendor = seedVendor(1);
  const issue = issuesFor(vendor).find((item) => item.group === "verify");
  assert.ok(issue);
  const first = decideIssue(vendor, "existing", "reject");
  const updated = decideIssue(first, issue.id, "accept");
  assert.equal(updated.review?.decisions.existing, "reject");
  assert.equal(first.review?.decisions[issue.id], undefined);
  assert.equal(
    issuesFor(updated).some((item) => item.id === issue.id),
    false,
  );
  assert.deepEqual(updated.products, vendor.products);
});

test("no-bid details, FAT, and variance do not create Verify items", () => {
  const vendor = seedVendor();
  const product = vendor.products.find((item) => item.lines.length === 0);
  assert.ok(product);
  product.nreCost = 25;
  vendor.products[0].lines[0].isFat = true;
  vendor.products[0].lines[0].variance = "Quoted variance";
  const before = structuredClone(vendor);
  assert.deepEqual(
    issuesFor(vendor).filter((issue) => issue.group === "verify"),
    [],
  );
  assert.deepEqual(vendor, before);
});

test("Verify compares a populated NSN with the matched RFQ line", () => {
  const vendor = seedVendor();
  const product = vendor.products[0];
  product.nsn = "5305-00-984-4988";
  const issue = issuesFor(vendor).find(
    (item) => item.id === `verify:nsn:${product.id}`,
  );
  assert.ok(issue);
  assert.equal(issue.group, "verify");
  assert.deepEqual(issue.targets, [{ productId: product.id, field: "nsn" }]);
  assert.equal(
    issue.source,
    "1. MS27039-1-08 | NSN 5305-00-984-6210 | requested qty breaks 100/250/500",
  );
  assert.equal(issue.apply, undefined);

  for (const nsn of ["5305-00-984-6210", ""]) {
    product.nsn = nsn;
    assert.equal(
      issuesFor(vendor).some((item) => item.id === issue.id),
      false,
    );
  }
});

test("Verify checks quoted quantities against requested RFQ breaks", () => {
  const vendor = seedVendor(1);
  const product = vendor.products.find(
    (item) => item.partNumber === "M83248/1-006",
  );
  assert.ok(product);
  const line = product.lines.find((item) => item.quantity === 25);
  assert.ok(line);
  for (const quantity of [25, 0]) {
    line.quantity = quantity;
    const issue: Issue | undefined = issuesFor(vendor).find(
      (item) => item.id === `verify:quantity:${line.id}`,
    );
    assert.ok(issue);
    assert.equal(issue.group, "verify");
    assert.deepEqual(issue.targets, [
      { productId: product.id, lineId: line.id, field: "quantity" },
    ]);
    assert.equal(
      issue.source,
      "4. M83248/1-006 | NSN 5330-01-130-1932 | requested qty breaks 10/50",
    );
    assert.equal(issue.apply, undefined);
  }

  line.isQuoting = false;
  assert.equal(
    issuesFor(vendor).some((item) => item.id === `verify:quantity:${line.id}`),
    false,
  );
  line.isQuoting = true;
  line.quantity = 10;
  assert.equal(
    issuesFor(vendor).some((item) => item.id === `verify:quantity:${line.id}`),
    false,
  );
});

test("vendor email changes do not change issue classification", () => {
  for (const index of [0, 1, 2]) {
    const vendor = seedVendor(index);
    const before = issuesFor(vendor).map((issue) => ({
      ...issue,
      source: undefined,
      apply: undefined,
    }));
    vendor.emails = vendor.emails.map((email, emailIndex) =>
      emailIndex === 0 ? email : { ...email, body: "", attachments: [] },
    );
    assert.deepEqual(
      issuesFor(vendor).map((issue) => ({
        ...issue,
        source: undefined,
        apply: undefined,
      })),
      before,
    );
  }
});

test("not-quoting lines skip required checks and no longer cover a break", () => {
  const vendor = seedVendor();
  const product = vendor.products[0];
  product.lines[0].isQuoting = false;
  const issues = issuesFor(vendor);
  assert.equal(
    issues.some((item) => item.id === `fix:${product.lines[0].id}`),
    false,
  );
  assert.match(
    issues.find((item) => item.id === `fix:breaks:${product.id}`)!.label,
    /100, 250/,
  );
});

test("a null quantity stays a Fix and cannot apply another quantity's values", () => {
  const vendor = seedVendor();
  const line = vendor.products[0].lines[0];
  line.quantity = null;
  const issue = issuesFor(vendor).find((item) => item.id === `fix:${line.id}`);
  assert.ok(issue);
  assert.ok(issue.targets.some((path) => path.field === "quantity"));
  assert.equal(issue.apply, undefined);
  assert.equal(
    issuesFor(vendor).some((item) => item.id === `verify:quantity:${line.id}`),
    false,
  );
});

test("source prefers newer vendor replies and matches complete part numbers", () => {
  const vendor = seedVendor(1);
  const [sent, reply] = vendor.emails;
  vendor.emails = [
    {
      ...reply,
      date: "2026-05-14T09:00:00Z",
      attachments: [],
      body: "MS35206-228 old",
    },
    {
      ...reply,
      from: "colleague@apex-components.example",
      date: "2026-05-16T09:00:00Z",
      attachments: [],
      body: "MS35206-228-AC alternate\n\nMS35206-228 current",
    },
    { ...sent, date: "2026-05-17T09:00:00Z", body: "MS35206-228 request" },
  ];
  assert.equal(findSource(vendor, "MS35206-228"), "MS35206-228 current");
  assert.equal(
    findSource(vendor, "MS35206-228-AC"),
    "MS35206-228-AC alternate",
  );
  assert.equal(findSource(vendor, ""), undefined);
});

test("Field states: extracted by default, edited on change, confirmed on Apply", () => {
  const vendor = seedVendor();
  const product = vendor.products[0];
  const line = product.lines[0];
  const termsKey = pathKey({ field: "paymentTerms" });
  const unitKey = pathKey({
    productId: product.id,
    lineId: line.id,
    field: "unitCost",
  });
  const none = new Set<string>();

  assert.equal(
    fieldState(termsKey, vendor.paymentTerms, none, undefined),
    "extracted",
  );
  assert.equal(fieldState(termsKey, "", none, undefined), undefined);
  assert.equal(
    fieldState(termsKey, vendor.paymentTerms, new Set([termsKey]), undefined),
    "flagged",
  );

  const edited = markEdits(vendor, { ...vendor, paymentTerms: "NET 45" });
  assert.deepEqual(edited.review?.fields, { [termsKey]: "edited" });
  assert.equal(markEdits(vendor, vendor), vendor);

  const issue = issuesFor(vendor).find((item) => item.id === `fix:${line.id}`);
  assert.ok(issue);
  const applied = applyIssue(edited, issue);
  assert.equal(applied.review?.fields?.[unitKey], "confirmed");
  assert.equal(applied.review?.fields?.[termsKey], "edited");
});
