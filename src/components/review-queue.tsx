import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Check, ChevronRight, ListChecks } from "lucide-react";

import type { Issue } from "@/lib/review/issues";
import { cn } from "@/lib/utils";

const groups = [
  {
    id: "fix",
    label: "Fix",
    description: "Missing RFQ requirements · alternate/extra part decisions",
  },
  {
    id: "verify",
    label: "Verify",
    description: "Extracted values that conflict with the RFQ",
  },
  {
    id: "ask",
    label: "Ask",
    description: "Missing optional fields · superseded part replacements",
  },
] as const;

export function ReviewQueue({
  issues,
  activeId,
  queueRef,
  onSelect,
  onFocusField,
  onResolve,
}: {
  issues: Issue[];
  activeId: string | null;
  queueRef: RefObject<HTMLDivElement | null>;
  onSelect: (issue: Issue) => void;
  onFocusField: (issue: Issue) => void;
  onResolve: (issue: Issue, action: "apply" | "accept" | "reject") => void;
}) {
  const groupId = useId();
  const [expanded, setExpanded] = useState({
    fix: false,
    verify: false,
    ask: false,
  });
  const visibleIssues = issues.filter((issue) => expanded[issue.group]);
  const activeRow = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <section
      aria-label="Review queue"
      className="flex min-h-0 max-h-[45%] shrink-0 flex-col border-b"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-7">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          Review queue
          <span
            className="text-xs font-normal text-muted-foreground"
            aria-live="polite"
          >
            {issues.length} open
          </span>
        </h2>
      </div>
      <div
        ref={queueRef}
        role="group"
        aria-label="Review queue items"
        tabIndex={0}
        className="min-h-0 overflow-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onKeyDown={(event) => {
          if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            !visibleIssues.length
          )
            return;
          const focusedId = (event.target as HTMLElement).getAttribute(
            "data-queue-select",
          );
          const index = visibleIssues.findIndex(
            (issue) => issue.id === (focusedId ?? activeId),
          );
          if (event.key === "j" || event.key === "k") {
            event.preventDefault();
            const next = Math.max(
              0,
              Math.min(
                visibleIssues.length - 1,
                index + (event.key === "j" ? 1 : -1),
              ),
            );
            onSelect(visibleIssues[next]);
            queueRef.current?.focus({ preventScroll: true });
          } else if (
            event.key === "Enter" &&
            (event.target === event.currentTarget ||
              (event.target as HTMLElement).hasAttribute("data-queue-select"))
          ) {
            if (index === -1) return;
            event.preventDefault();
            const issue = visibleIssues[index];
            if (issue.apply?.length) onResolve(issue, "apply");
            else onFocusField(issue);
          }
        }}
      >
        {groups.map((group) => {
          const items = issues.filter((issue) => issue.group === group.id);
          return (
            <div key={group.id}>
              <h3 className="sticky top-0 z-10 border-y bg-muted text-xs">
                <button
                  type="button"
                  aria-expanded={expanded[group.id]}
                  aria-controls={`${groupId}-${group.id}`}
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [group.id]: !current[group.id],
                    }))
                  }
                  className="flex w-full cursor-pointer items-center gap-2 px-5 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-7"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 shrink-0 transition-transform",
                      expanded[group.id] && "rotate-90",
                    )}
                  />
                  <span className="font-semibold">
                    {group.label} {items.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {group.description}
                  </span>
                </button>
              </h3>
              <div id={`${groupId}-${group.id}`} hidden={!expanded[group.id]}>
                {!items.length && (
                  <p className="flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground md:px-7">
                    <Check className="size-3" aria-hidden="true" />
                    {group.id === "fix"
                      ? "No fixes remaining"
                      : `Nothing to ${group.id}`}
                  </p>
                )}
                <ul className="divide-y">
                  {items.map((issue) => {
                    const active = activeId === issue.id;
                    const decision =
                      issue.id.startsWith("alt:") ||
                      issue.id.startsWith("extra:");
                    return (
                      <li
                        key={issue.id}
                        className={cn(
                          "border-l-2 border-l-transparent px-5 py-3 transition-colors md:px-7",
                          active && "border-l-primary bg-accent/60",
                        )}
                      >
                        <button
                          type="button"
                          ref={
                            active && expanded[group.id] ? activeRow : undefined
                          }
                          data-queue-select={issue.id}
                          aria-pressed={active}
                          onClick={() => onSelect(issue)}
                          className="block w-full cursor-pointer scroll-mt-12 rounded-sm text-left text-xs leading-5 font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {issue.label}
                        </button>
                        {issue.source && (
                          <pre className="mt-2 border-l-2 border-primary/25 pl-3 font-mono text-[11px] leading-4 whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
                            {issue.source}
                          </pre>
                        )}
                        {issue.question && (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {issue.question}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 empty:hidden">
                          {issue.apply?.length ? (
                            <button
                              type="button"
                              onClick={() => onResolve(issue, "apply")}
                              className="cursor-pointer rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              Apply
                            </button>
                          ) : null}
                          {decision && (
                            <button
                              type="button"
                              onClick={() => onResolve(issue, "accept")}
                              className="cursor-pointer rounded-sm border bg-background px-3 py-1.5 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Accept
                            </button>
                          )}
                          {decision && (
                            <button
                              type="button"
                              onClick={() => onResolve(issue, "reject")}
                              className="cursor-pointer rounded-sm border bg-background px-3 py-1.5 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Reject
                            </button>
                          )}
                          {issue.group === "verify" && (
                            <button
                              type="button"
                              onClick={() => onResolve(issue, "accept")}
                              className="cursor-pointer rounded-sm border bg-background px-3 py-1.5 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Keep
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
