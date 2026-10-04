import { useMemo, useRef, useState } from "react";
import { Check, Mail, Rows3 } from "lucide-react";

import { EmailThread } from "@/components/email-thread";
import { FieldStateLegend } from "@/components/field-input";
import {
  FollowUpComposer,
  type SendState,
} from "@/components/follow-up-composer";
import { ProductFields } from "@/components/product-fields";
import { QuoteFields } from "@/components/quote-fields";
import { ReviewQueue } from "@/components/review-queue";
import { applyIssue, decideIssue } from "@/lib/review/actions";
import {
  fieldState,
  markEdits,
  setMarks,
  type StateOf,
} from "@/lib/review/field-state";
import { findIssues, pathKey, type Issue } from "@/lib/review/issues";
import { orderProducts, parseRfq } from "@/lib/review/rfq";
import type { Vendor } from "@/lib/types";

function orderedIssues(vendor: Vendor, rfq: ReturnType<typeof parseRfq>) {
  const issues = findIssues(vendor, rfq);
  return (["fix", "verify", "ask"] as const).flatMap((group) =>
    issues.filter((issue) => issue.group === group),
  );
}

export function VendorReview({
  vendor,
  onChange,
  onSend,
  sendState,
}: {
  vendor: Vendor;
  onChange: (vendor: Vendor) => void;
  onSend: (body: string) => Promise<void>;
  sendState?: SendState;
}) {
  const rfq = useMemo(() => parseRfq(vendor.emails[0].body), [vendor.emails]);
  const issues = orderedIssues(vendor, rfq);
  const hasFixes = issues.some((issue) => issue.group === "fix");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = issues.find((issue) => issue.id === activeId) ?? issues[0];
  const flagged = new Set(
    issues
      .filter((issue) => issue.group !== "ask")
      .flatMap((issue) => issue.targets.map(pathKey)),
  );
  const activePaths = new Set(active?.targets.map(pathKey));
  const stateOf: StateOf = (key, value) =>
    fieldState(key, value, flagged, vendor.review?.fields);

  // Every edit from the fields panel marks the fields it changed "edited".
  function editFields(updated: Vendor) {
    onChange(markEdits(vendor, updated));
  }
  const fieldsRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);

  function select(issue: Issue, focus = false) {
    setActiveId(issue.id);
    const path = issue.targets[0];
    if (!path) return;
    const target =
      fieldsRef.current?.querySelector<HTMLElement>(
        `[data-path="${CSS.escape(pathKey(path))}"]`,
      ) ??
      (path.productId
        ? fieldsRef.current?.querySelector<HTMLElement>(
            `[data-product-id="${CSS.escape(path.productId)}"]`,
          )
        : null);
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (focus)
      target
        ?.querySelector<HTMLElement>("input, select, textarea")
        ?.focus({ preventScroll: true });
  }

  function resolve(issue: Issue, action: "apply" | "accept" | "reject") {
    const updated =
      action === "apply"
        ? applyIssue(vendor, issue)
        : action === "accept"
          ? // Keeping a value (or an alternate) is a person confirming it.
            setMarks(
              decideIssue(vendor, issue.id, action),
              issue.targets.map(pathKey),
              "confirmed",
            )
          : decideIssue(vendor, issue.id, action);
    const remaining = orderedIssues(updated, rfq);
    const next =
      remaining[
        Math.min(
          issues.findIndex((item) => item.id === issue.id),
          remaining.length - 1,
        )
      ];
    onChange(updated);
    setActiveId(next?.id ?? null);
    requestAnimationFrame(() => {
      if (next) select(next);
      queueRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          fieldsRef.current?.contains(event.target as Node)
        ) {
          event.preventDefault();
          queueRef.current?.scrollIntoView({ block: "nearest" });
          queueRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b px-5 py-3 md:px-7">
        <div className="min-w-0 text-xs">
          <span className="font-medium">{vendor.contactName}</span>
          <span className="mx-2 text-border" aria-hidden="true">
            /
          </span>
          <span className="break-all text-muted-foreground">
            {vendor.contactEmail}
          </span>
        </div>
        <dl className="flex gap-5 text-xs">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Terms</dt>
            <dd className="font-medium">{vendor.paymentTerms || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Validity</dt>
            <dd className="font-medium">
              {vendor.daysQuoteValid === null
                ? "—"
                : `${vendor.daysQuoteValid} days`}
            </dd>
          </div>
        </dl>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(24rem,1fr)_minmax(28rem,2fr)] overflow-auto xl:grid-cols-[2fr_3fr] xl:grid-rows-1 xl:overflow-hidden">
        <section
          aria-labelledby={`${vendor.id}-emails`}
          className="flex min-h-0 min-w-0 flex-col border-b xl:border-r xl:border-b-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-3 md:px-7">
            <h2
              id={`${vendor.id}-emails`}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <Mail
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              Email thread
            </h2>
            <span className="text-xs text-muted-foreground">
              {vendor.emails.length} messages
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <EmailThread emails={vendor.emails} source={active?.source} />
          </div>
          <FollowUpComposer
            vendor={vendor}
            questions={issues.filter((issue) => issue.question)}
            onChange={onChange}
            onSend={onSend}
            sendState={sendState}
          />
        </section>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 md:px-7">
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {vendor.submittedAt ? (
                <>
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  RFQ submitted
                </>
              ) : hasFixes ? (
                "Resolve all Fix items to submit."
              ) : (
                "Ready to submit. Verify and Ask are non-blocking."
              )}
            </p>
            <button
              type="button"
              disabled={hasFixes || !!vendor.submittedAt}
              onClick={() =>
                onChange({ ...vendor, submittedAt: new Date().toISOString() })
              }
              className="cursor-pointer rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {vendor.submittedAt ? "Submitted" : "Submit RFQ"}
            </button>
          </div>
          <ReviewQueue
            issues={issues}
            activeId={active?.id ?? null}
            queueRef={queueRef}
            onSelect={select}
            onFocusField={(issue) => select(issue, true)}
            onResolve={resolve}
          />
          <section
            aria-labelledby={`${vendor.id}-parts`}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-3 md:px-7">
              <h2
                id={`${vendor.id}-parts`}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Rows3
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Extracted fields
              </h2>
              <div className="flex items-center gap-4">
                <FieldStateLegend />
                <span className="text-xs text-muted-foreground">
                  {vendor.products.length} parts
                </span>
              </div>
            </div>
            <div
              ref={fieldsRef}
              className="min-h-0 flex-1 overflow-auto overscroll-contain"
            >
              <QuoteFields
                vendor={vendor}
                onChange={editFields}
                stateOf={stateOf}
                activePaths={activePaths}
              />
              {orderProducts(vendor.products, rfq).map(({ product, match }) => (
                <ProductFields
                  key={product.id}
                  product={product}
                  match={match}
                  decision={
                    match.decisionId
                      ? vendor.review?.decisions[match.decisionId]
                      : undefined
                  }
                  onUndo={() => {
                    if (!match.decisionId) return;
                    // The decision's Fix item returns to the queue; select it there.
                    onChange(decideIssue(vendor, match.decisionId, null));
                    setActiveId(match.decisionId);
                  }}
                  stateOf={stateOf}
                  activePaths={activePaths}
                  onChange={(updated) =>
                    editFields({
                      ...vendor,
                      products: vendor.products.map((current) =>
                        current.id === updated.id ? updated : current,
                      ),
                    })
                  }
                />
              ))}
            </div>
            <p className="shrink-0 border-t bg-muted/30 px-5 py-2 text-[11px] text-muted-foreground md:px-7">
              Field edits reset on refresh · Esc returns to the queue
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
