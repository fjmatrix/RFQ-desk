import { randomUUID } from "node:crypto";
import seed from "../../data/vq-data.json";
import type { Email, Vendor } from "../types";

export function getVendors(): Vendor[] {
  return structuredClone(seed.vendors) as Vendor[];
}

export function buildReply(vendorId: string, body: string): Email | undefined {
  const vendor = seed.vendors.find((item) => item.id === vendorId);
  if (!vendor) return undefined;

  const original = vendor.emails[0];
  const subject = vendor.emails[vendor.emails.length - 1].subject;
  return {
    id: randomUUID(),
    from: original.from,
    fromName: original.fromName,
    to: vendor.contactEmail,
    date: new Date().toISOString(),
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
    body,
    attachments: [],
  };
}
