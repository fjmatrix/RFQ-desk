import assert from "node:assert/strict";
import { test } from "node:test";

import data from "../../data/vq-data.json";
import type { Vendor } from "../types";
import { draftFollowUp, findIssues } from "./issues";
import { parseRfq } from "./rfq";
import { findSource } from "./source";

test("follow-up includes selected Fix and Ask questions, excluding other issues", () => {
  for (const vendor of data.vendors) {
    const before = structuredClone(vendor);
    const issues = findIssues(vendor, parseRfq(vendor.emails[0].body));
    const questions = issues.filter((issue) => issue.question);
    const fix = questions.find((issue) => issue.group === "fix");
    const ask = questions.find((issue) => issue.group === "ask");
    assert.ok(fix);
    const selected = [fix];
    if (ask) selected.push(ask);
    const draft = draftFollowUp(vendor, [
      ...issues.filter((issue) => !issue.question),
      ...selected,
    ]);
    assert.equal(
      draft,
      `Hi ${vendor.contactName.split(" ")[0]},\n\nThanks for the quote.\n\n${selected.map((issue) => `- ${issue.question}`).join("\n")}\n\nThanks,`,
    );
    for (const omitted of questions.filter(
      (issue) => !selected.includes(issue),
    )) {
      assert.ok(!draft.includes(omitted.question!));
    }
    assert.doesNotMatch(draftFollowUp(vendor, issues), /payment|validity/i);
    assert.deepEqual(vendor, before);
  }
});

test("follow-up asks for a superseded replacement and updates after a quote correction", () => {
  const vendor: Vendor = structuredClone(data.vendors[2]);
  const rfq = parseRfq(vendor.emails[0].body);
  let issues = findIssues(vendor, rfq);
  const detailAsk = issues.find((issue) => issue.id.startsWith("ask:details:"));
  assert.ok(detailAsk?.question);
  assert.match(
    draftFollowUp(vendor, issues),
    /What replaces the superseded AN960-10\?/,
  );
  const product = vendor.products.find(
    (item) => item.id === detailAsk.targets[0].productId,
  );
  assert.ok(product);
  assert.equal(product.coo, "");
  product.coo = "DE";
  issues = findIssues(vendor, rfq);
  assert.ok(!draftFollowUp(vendor, issues).includes(detailAsk.question));
});

test("outgoing follow-ups do not become vendor quote evidence or change review issues", () => {
  const vendor: Vendor = structuredClone(data.vendors[0]);
  const rfq = parseRfq(vendor.emails[0].body);
  const issues = findIssues(vendor, rfq);
  const source = findSource(vendor, vendor.products[0].partNumber);
  const draft = draftFollowUp(vendor, issues);
  vendor.emails.push({
    ...vendor.emails[0],
    id: "outgoing-follow-up",
    date: "2099-01-01T00:00:00Z",
    subject: `Re: ${vendor.emails[0].subject}`,
    body: draft,
    attachments: [],
  });
  assert.equal(findSource(vendor, vendor.products[0].partNumber), source);
  assert.deepEqual(findIssues(vendor, rfq), issues);
});
