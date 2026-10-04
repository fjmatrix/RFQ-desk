import type { Line, Product, Vendor } from "./types";

type FieldType =
  "text" | "textarea" | "integer" | "currency" | "checkbox" | "single_select";

export type FieldDef<T extends object> = {
  field: Extract<keyof T, string>;
  header: string;
  type: FieldType;
  required?: boolean;
};

export const HEADER_FIELD_DEFS: readonly FieldDef<Vendor>[] = [
  {
    field: "paymentTerms",
    header: "Payment Terms",
    type: "text",
    required: true,
  },
  {
    field: "daysQuoteValid",
    header: "Days Quote Valid",
    type: "integer",
    required: true,
  },
  {
    field: "vendorContact",
    header: "Vendor Contact",
    type: "text",
    required: true,
  },
  { field: "additionalNotes", header: "Header Notes", type: "textarea" },
];

export const PRODUCT_FIELD_DEFS: readonly FieldDef<Product>[] = [
  { field: "partNumber", header: "PN", type: "text", required: true },
  { field: "nsn", header: "NSN", type: "text" },
  { field: "description", header: "Description", type: "textarea" },
  { field: "mfrPartNumber", header: "Mfr Part Number", type: "text" },
  { field: "mfrCage", header: "Mfr CAGE", type: "text" },
  { field: "coo", header: "COO", type: "text" },
  { field: "certifications", header: "Certifications", type: "textarea" },
  { field: "nreCost", header: "NRE Cost", type: "currency" },
  {
    field: "packagingIncluded",
    header: "Packaging Included",
    type: "checkbox",
  },
  { field: "shippingIncluded", header: "Shipping Included", type: "checkbox" },
  { field: "hazmatItem", header: "Hazmat Item", type: "checkbox" },
  { field: "additionalNotes", header: "Product Notes", type: "textarea" },
];

export const LINE_FIELD_DEFS: readonly FieldDef<Line>[] = [
  { field: "isQuoting", header: "Is Quoting?", type: "checkbox" },
  { field: "quantity", header: "Quantity", type: "integer", required: true },
  { field: "isFat", header: "Is FAT", type: "checkbox" },
  { field: "unitCost", header: "Unit Cost", type: "currency", required: true },
  { field: "variance", header: "Variance", type: "text" },
  { field: "price", header: "Price", type: "currency", required: true },
  {
    field: "currency",
    header: "Currency",
    type: "single_select",
    required: true,
  },
  { field: "leadTime", header: "Lead Time", type: "integer", required: true },
  { field: "additionalNotes", header: "Line Notes", type: "textarea" },
];
