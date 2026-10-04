import { Inbox, Paperclip } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Vendor } from "@/lib/types";

const inboxDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function EmailInbox({ vendors }: { vendors: Vendor[] }) {
  return (
    <aside
      aria-labelledby="inbox-heading"
      className="flex max-h-52 shrink-0 flex-col border-b bg-muted/30 md:max-h-none md:w-72 md:border-r md:border-b-0"
    >
      <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
        <h2
          id="inbox-heading"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Inbox className="size-4 text-primary" aria-hidden="true" />
          Inbox
        </h2>
        <span className="text-xs text-muted-foreground">
          {vendors.length} conversations
        </span>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <TabsList
          aria-label="Vendor inbox"
          className="w-full items-stretch justify-start gap-0 rounded-none bg-transparent p-0"
        >
          {vendors.map((vendor) => {
            const latestEmail = vendor.emails[vendor.emails.length - 1];
            const hasAttachments = vendor.emails.some(
              (email) => email.attachments.length > 0,
            );

            return (
              <TabsTrigger
                key={vendor.id}
                value={vendor.id}
                aria-label={vendor.name}
                className="h-auto flex-none cursor-pointer flex-col items-stretch gap-1 rounded-none border-0 border-b border-l-2 border-l-transparent px-5 py-3 text-left whitespace-normal transition-colors after:hidden hover:bg-muted focus-visible:z-10 focus-visible:ring-inset data-active:border-l-primary data-active:bg-accent data-active:text-accent-foreground data-active:hover:bg-accent md:gap-2 md:py-4 group-data-[variant=default]/tabs-list:data-active:shadow-none dark:data-active:border-l-primary dark:data-active:bg-accent dark:data-active:text-accent-foreground"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span
                    className="truncate text-sm font-semibold"
                    title={vendor.name}
                  >
                    {vendor.name}
                  </span>
                  <time
                    dateTime={latestEmail.date}
                    className="shrink-0 text-[11px] font-normal text-muted-foreground"
                  >
                    {inboxDate.format(new Date(latestEmail.date))}
                  </time>
                </span>
                <span className="hidden items-center justify-between gap-2 text-xs font-normal text-muted-foreground md:flex">
                  <span className="truncate">{latestEmail.fromName}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {hasAttachments && (
                      <span role="img" aria-label="Has attachments">
                        <Paperclip className="size-3" aria-hidden="true" />
                      </span>
                    )}
                    {vendor.emails.length} messages
                  </span>
                </span>
                <span
                  className="truncate text-xs font-medium text-foreground"
                  title={latestEmail.subject}
                >
                  {latestEmail.subject}
                </span>
                <span className="hidden text-xs leading-5 font-normal text-muted-foreground md:line-clamp-2">
                  {latestEmail.body}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </aside>
  );
}
