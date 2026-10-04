export type RfqLine = {
  pn: string;
  nsn: string;
  breaks: number[];
  source: string;
};

// "1. MS27039-1-08 | NSN 5305-00-984-6210 | requested qty breaks 100/250/500"
const RFQ_LINE =
  /^\s*(\d+)\.\s+(\S+)\s*\|\s*NSN\s+([\d-]+)\s*\|\s*requested qty breaks\s+([\d/]+)/gm;

export const parseRfq = (body: string): RfqLine[] =>
  [...body.matchAll(RFQ_LINE)].map((m) => ({
    pn: m[2],
    nsn: m[3],
    breaks: m[4].split("/").map(Number),
    source: m[0].trim(),
  }));

export type ProductRole = "requested" | "alternate" | "extra";

export type ProductMatch = {
  /** The RFQ line this product answers: same PN first, then same NSN. */
  requested: RfqLine | undefined;
  role: ProductRole;
  /** The Fix item a buyer accepts or rejects; only alternates and extras have one. */
  decisionId: string | undefined;
};

// Same PN is the requested part, same NSN is an alternate, neither is an extra. The queue and the
// product cards both read this, so an alternate's decision and its card can't disagree.
export function matchProduct(
  product: { id: string; partNumber: string; nsn: string },
  rfq: RfqLine[],
): ProductMatch {
  const requested =
    rfq.find((line) => line.pn === product.partNumber) ||
    rfq.find((line) => line.nsn === product.nsn);
  // A blank PN is a missing value (findIssues raises it), not an alternate or an extra.
  const role: ProductRole = !requested
    ? "extra"
    : requested.pn === product.partNumber || !product.partNumber
      ? "requested"
      : "alternate";
  const decisionId =
    product.partNumber && role !== "requested"
      ? `${role === "alternate" ? "alt" : "extra"}:${product.id}`
      : undefined;
  return { requested, role, decisionId };
}

/** View order: RFQ order, with each alternate in its requested part's slot and extras last. */
export function orderProducts<
  T extends { id: string; partNumber: string; nsn: string },
>(products: T[], rfq: RfqLine[]): { product: T; match: ProductMatch }[] {
  const slot = (match: ProductMatch) =>
    match.requested ? rfq.indexOf(match.requested) : rfq.length;
  return products
    .map((product) => ({ product, match: matchProduct(product, rfq) }))
    .sort((a, b) => slot(a.match) - slot(b.match));
}
