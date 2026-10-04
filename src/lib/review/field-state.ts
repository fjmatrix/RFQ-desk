import type { Vendor } from "../types";
import { pathKey, type FieldPath } from "./issues";

/** Stored per field once a person touches it. */
export type FieldMark = "edited" | "confirmed";

/**
 * What a field shows. "extracted" is the default for any populated value no
 * one has touched; "flagged" is derived from open Fix/Verify issues and wins
 * over everything else. Blank, untouched fields have no state.
 */
export type FieldState = "extracted" | FieldMark | "flagged";

export const FIELD_STATES: readonly FieldState[] = [
  "extracted",
  "edited",
  "confirmed",
  "flagged",
];

export const FIELD_STATE_LABEL: Record<FieldState, string> = {
  extracted: "Extracted",
  edited: "Edited",
  confirmed: "Confirmed",
  flagged: "Review",
};

export type StateOf = (key: string, value: unknown) => FieldState | undefined;

export function fieldState(
  key: string,
  value: unknown,
  flagged: Set<string>,
  marks: Record<string, FieldMark> | undefined,
): FieldState | undefined {
  if (flagged.has(key)) return "flagged";
  if (marks?.[key]) return marks[key];
  return value === null || value === undefined || value === ""
    ? undefined
    : "extracted";
}

export function setMarks(
  vendor: Vendor,
  keys: string[],
  mark: FieldMark,
): Vendor {
  if (keys.length === 0) return vendor;
  return {
    ...vendor,
    review: {
      decisions: vendor.review?.decisions ?? {},
      fields: {
        ...vendor.review?.fields,
        ...Object.fromEntries(keys.map((key) => [key, mark])),
      },
    },
  };
}

/** Diff two versions of a vendor and mark every changed scalar field "edited". */
export function markEdits(before: Vendor, after: Vendor): Vendor {
  const changed: string[] = [];
  const diff = (prev: object, next: object, at: Omit<FieldPath, "field">) => {
    for (const [field, value] of Object.entries(next)) {
      if (typeof value === "object" && value !== null) continue; // products, lines, emails, review
      if ((prev as Record<string, unknown>)[field] !== value) {
        changed.push(pathKey({ ...at, field }));
      }
    }
  };

  diff(before, after, {});
  for (const product of after.products) {
    const prev = before.products.find((item) => item.id === product.id);
    if (!prev || prev === product) continue;
    diff(prev, product, { productId: product.id });
    for (const line of product.lines) {
      const prevLine = prev.lines.find((item) => item.id === line.id);
      if (prevLine && prevLine !== line) {
        diff(prevLine, line, { productId: product.id, lineId: line.id });
      }
    }
  }
  return setMarks(after, changed, "edited");
}
