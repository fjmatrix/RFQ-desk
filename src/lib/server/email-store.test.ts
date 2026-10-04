import assert from "node:assert/strict";
import { test } from "node:test";

import data from "../../data/vq-data.json";
import { POST } from "../../app/api/vendors/[vendorId]/emails/route";
import { getVendors } from "./email-store";

const send = (vendorId: string, body: string) =>
  POST(
    new Request("http://localhost/api/vendors/test/emails", {
      method: "POST",
      body,
    }),
    {
      params: Promise.resolve({ vendorId }),
    },
  );

test("invalid bodies and unknown vendors leave the seed data untouched", async () => {
  for (const payload of [
    "{",
    "null",
    "[]",
    "{}",
    '{"body":42}',
    '{"body":"  "}',
  ]) {
    const response = await send(data.vendors[0].id, payload);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).message);
  }
  assert.equal((await send("missing-vendor", '{"body":"Hello"}')).status, 404);
  assert.deepEqual(getVendors(), data.vendors);
});

test("Send returns server-derived headers and preserves the body verbatim", async () => {
  const vendor = data.vendors[0];
  const body =
    "  Hi Mike,\n\nPlease confirm the requested breaks.\n\nThanks,\n";
  const response = await send(
    vendor.id,
    JSON.stringify({
      body,
      from: "spoof@example.com",
      to: "spoof@example.com",
    }),
  );
  assert.equal(response.status, 201);
  const { email } = await response.json();
  assert.equal(email.body, body);
  assert.equal(email.from, vendor.emails[0].from);
  assert.equal(email.fromName, vendor.emails[0].fromName);
  assert.equal(email.to, vendor.contactEmail);
  assert.equal(email.subject, vendor.emails.at(-1)?.subject);
  assert.match(email.id, /^[0-9a-f-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(email.date)));
  assert.deepEqual(email.attachments, []);
});

test("consecutive sends add the reply prefix and leave the seed data unchanged", async () => {
  const before = getVendors();
  const vendor = data.vendors[2];
  for (const body of ["First reply", "Second reply"]) {
    const response = await send(vendor.id, JSON.stringify({ body }));
    assert.equal(response.status, 201);
    const { email } = await response.json();
    assert.equal(email.body, body);
    assert.equal(email.subject, `Re: ${vendor.emails.at(-1)?.subject}`);
    assert.deepEqual(getVendors(), before);
  }
});

test("getVendors isolates changes to drafts and nested emails", () => {
  const vendors = getVendors();
  vendors[0].followUpDraft = "Changed draft";
  vendors[0].emails[0].body = "Changed email";
  assert.deepEqual(getVendors(), data.vendors);
});
