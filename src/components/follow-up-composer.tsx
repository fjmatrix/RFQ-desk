import { useState } from "react";

import { draftFollowUp, type Issue } from "@/lib/review/issues";
import type { Vendor } from "@/lib/types";

export type SendState =
  { status: "sending" | "sent" } | { status: "error"; message: string };

export function FollowUpComposer({
  vendor,
  questions,
  onChange,
  onSend,
  sendState,
}: {
  vendor: Vendor;
  questions: Issue[];
  onChange: (vendor: Vendor) => void;
  onSend: (body: string) => Promise<void>;
  sendState?: SendState;
}) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const sending = sendState?.status === "sending";
  const errorMessage =
    sendState?.status === "error" ? sendState.message : error;
  const selected = questions.filter((issue) => !excluded.includes(issue.id));
  const hasDraft = !!vendor.followUpDraft.trim();

  function updateDraft(body: string) {
    setError("");
    setStatus("");
    onChange({ ...vendor, followUpDraft: body });
  }

  function send() {
    setError("");
    setStatus("");
    void onSend(vendor.followUpDraft);
  }

  async function copy() {
    setError("");
    setStatus("");
    try {
      await navigator.clipboard.writeText(vendor.followUpDraft);
      setStatus("Copied");
    } catch {
      setError("Could not copy the draft.");
    }
  }

  return (
    <div className="max-h-[65%] shrink-0 space-y-3 overflow-auto border-t bg-muted/20 px-5 py-4 md:px-7 xl:max-h-[50%]">
      <details open>
        <summary className="cursor-pointer rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ask vendor · {selected.length} selected
        </summary>
        {questions.length ? (
          <div className="mt-3 space-y-2">
            {questions.map((issue) => (
              <label
                key={issue.id}
                className="flex items-start gap-2 text-xs leading-5"
              >
                <input
                  type="checkbox"
                  checked={!excluded.includes(issue.id)}
                  onChange={(event) =>
                    setExcluded((current) =>
                      event.target.checked
                        ? current.filter((id) => id !== issue.id)
                        : [...current, issue.id],
                    )
                  }
                  className="mt-1 accent-primary"
                />
                <span>{issue.question}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No questions remaining.
          </p>
        )}
      </details>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${vendor.id}-draft`} className="text-xs font-medium">
          Reply draft
        </label>
        <button
          type="button"
          disabled={!selected.length || sending}
          onClick={() => updateDraft(draftFollowUp(vendor, selected))}
          className="cursor-pointer rounded-sm border bg-background px-3 py-1.5 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Write draft
        </button>
      </div>
      <textarea
        id={`${vendor.id}-draft`}
        rows={4}
        value={vendor.followUpDraft}
        onChange={(event) => updateDraft(event.target.value)}
        disabled={sending}
        placeholder="Write a reply…"
        className="block min-h-24 w-full resize-y rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-muted-foreground">
          {status || (sendState?.status === "sent" ? "Added to thread" : "")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasDraft}
            onClick={copy}
            className="cursor-pointer rounded-sm border bg-background px-3 py-1.5 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy
          </button>
          <button
            type="button"
            disabled={!hasDraft || sending}
            onClick={send}
            className="cursor-pointer rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
      {errorMessage && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
