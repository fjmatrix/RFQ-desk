import type { Vendor } from "../types";
import { setMarks } from "./field-state";
import { pathKey, type Issue } from "./issues";

export function applyIssue(vendor: Vendor, issue: Issue): Vendor {
  const updated = structuredClone(vendor);
  for (const { path, value } of issue.apply ?? []) {
    const product = path.productId
      ? updated.products.find((item) => item.id === path.productId)
      : undefined;
    const line = path.lineId
      ? product?.lines.find((item) => item.id === path.lineId)
      : undefined;
    if ((path.productId && !product) || (path.lineId && !line)) {
      throw new Error(`Review target not found: ${issue.id}`);
    }
    Object.assign(line ?? product ?? updated, { [path.field]: value });
  }
  // A value applied from the vendor's own email counts as confirmed.
  return setMarks(
    updated,
    (issue.apply ?? []).map(({ path }) => pathKey(path)),
    "confirmed",
  );
}

/** Record a call on an issue; `null` undoes it, so the item returns to the queue. */
export function decideIssue(
  vendor: Vendor,
  issueId: string,
  decision: "accept" | "reject" | null,
): Vendor {
  const decisions = { ...vendor.review?.decisions };
  if (decision === null) delete decisions[issueId];
  else decisions[issueId] = decision;
  return { ...vendor, review: { ...vendor.review, decisions } };
}
