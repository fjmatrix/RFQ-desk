import type { Vendor } from "../types";

const domainOf = (address: string) =>
  address.slice(address.lastIndexOf("@") + 1).toLowerCase();

// The vendor's side of the thread, newest first: every email from the contact's domain, so a
// colleague's reply counts and ours are skipped. Body plus attachment pages.
function vendorText(vendor: Vendor): string {
  const domain = domainOf(vendor.contactEmail);
  return vendor.emails
    .filter((email) => domainOf(email.from) === domain)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((email) => [
      email.body,
      ...email.attachments.flatMap((attachment) => attachment.pages),
    ])
    .join("\n\n");
}

export function findSource(vendor: Vendor, pn: string): string | undefined {
  if (!pn.trim()) return undefined; // an empty PN would match the first paragraph
  const escapedPn = pn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\w-])${escapedPn}(?![\\w-])`);
  return vendorText(vendor)
    .split(/\n[ \t]*\n/)
    .find((paragraph) => re.test(paragraph))
    ?.trim();
}

// "qty 100: USD 1.74 ea / 174.00 ext / 18d", the one quote-line format all three vendors use.
const QUOTE_LINE =
  /qty\s+(\d+):\s+([A-Z]{3})\s+([\d.]+)\s+ea\s*\/\s*([\d.]+)\s+ext\s*\/\s*(\d+)d/g;

export function quoteLine(
  source: string,
  quantity: number,
): Record<string, unknown> | undefined {
  const match = [...source.matchAll(QUOTE_LINE)].find(
    (m) => Number(m[1]) === quantity,
  );
  return match
    ? {
        currency: match[2],
        unitCost: Number(match[3]),
        price: Number(match[4]),
        leadTime: Number(match[5]),
      }
    : undefined;
}
