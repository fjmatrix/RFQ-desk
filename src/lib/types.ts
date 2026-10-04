import type data from "../data/vq-data.json";

type SeedVendor = (typeof data.vendors)[number];

export type Vendor = Omit<
  SeedVendor,
  "daysQuoteValid" | "products" | "submittedAt" | "emails"
> & {
  daysQuoteValid: number | null;
  products: Product[];
  submittedAt: string | null;
  emails: Email[];
  review?: {
    decisions: Record<string, "accept" | "reject">; // issue id → the call on an alternate or extra; 'accept' also keeps a Verify value
    fields?: Record<string, "edited" | "confirmed">; // pathKey → set once a person edits or confirms the field
  };
};
export type Email = SeedVendor["emails"][number];
export type Product = Omit<
  SeedVendor["products"][number],
  "lines" | "packagingIncluded" | "shippingIncluded" | "hazmatItem" | "nreCost"
> & {
  lines: Line[];
  packagingIncluded: boolean | null;
  shippingIncluded: boolean | null;
  hazmatItem: boolean | null;
  nreCost: number | null;
};
export type Line = Omit<
  SeedVendor["products"][number]["lines"][number],
  "quantity" | "isQuoting"
> & {
  quantity: number | null;
  isQuoting: boolean | null;
};
