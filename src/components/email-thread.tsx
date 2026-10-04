import { ChevronRight, Paperclip } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Email } from "@/lib/types";

const emailDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function highlightSource(text: string, source?: string) {
  const index = source ? text.indexOf(source) : -1;
  if (!source || index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent text-accent-foreground outline-2 outline-primary/20">
        {source}
      </mark>
      {text.slice(index + source.length)}
    </>
  );
}

export function EmailThread({
  emails,
  source,
}: {
  emails: Email[];
  source?: string;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(emails.length);
  const sourceEmail = source
    ? emails
        .filter((email, index) => index === 0 || email.from !== emails[0].from)
        .sort((a, b) => b.date.localeCompare(a.date))
        .find(
          (email) =>
            email.body.includes(source) ||
            email.attachments.some((attachment) =>
              attachment.pages.some((page) => page.includes(source)),
            ),
        )
    : undefined;

  useEffect(() => {
    const mark = threadRef.current?.querySelector("mark");
    if (!mark) return;
    let parent = mark.parentElement;
    while (parent && parent !== threadRef.current) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    mark.scrollIntoView({ block: "nearest" });
  }, [source]);

  useEffect(() => {
    if (emails.length > previousCount.current) {
      threadRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
    }
    previousCount.current = emails.length;
  }, [emails.length]);

  return (
    <div ref={threadRef} className="divide-y divide-border">
      {emails.map((email, index) => (
        <details
          key={email.id}
          open={index !== 0}
          className="group/email px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-start gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open/email:rotate-90"
            />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium">{email.fromName}</span>
                <time
                  dateTime={email.date}
                  className="text-xs text-muted-foreground"
                >
                  {emailDate.format(new Date(email.date))}
                </time>
              </span>
              <span className="block text-xs leading-5 text-muted-foreground">
                {email.subject}
              </span>
            </span>
          </summary>

          <div className="mt-3 pl-6">
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <dt>From</dt>
              <dd className="[overflow-wrap:anywhere]">{email.from}</dd>
              <dt>To</dt>
              <dd className="[overflow-wrap:anywhere]">{email.to}</dd>
            </dl>

            <pre className="mt-4 whitespace-pre-wrap font-mono text-[12px] leading-5 text-foreground/85 [overflow-wrap:anywhere]">
              {highlightSource(
                email.body,
                email.id === sourceEmail?.id ? source : undefined,
              )}
            </pre>

            {email.attachments.map((attachment) => (
              <details
                key={attachment.id}
                open
                className="group/attachment mt-5 border-t border-border pt-4"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/attachment:rotate-90"
                  />
                  <Paperclip
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="font-medium [overflow-wrap:anywhere]">
                    {attachment.filename}
                  </span>
                </summary>
                {attachment.pages.map((page, pageIndex) => (
                  <div key={pageIndex} className="mt-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Page {pageIndex + 1}
                    </p>
                    <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-foreground/85 [overflow-wrap:anywhere]">
                      {highlightSource(
                        page,
                        email.id === sourceEmail?.id ? source : undefined,
                      )}
                    </pre>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
