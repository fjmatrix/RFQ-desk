"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import { EmailInbox } from "@/components/email-inbox";
import type { SendState } from "@/components/follow-up-composer";
import { VendorReview } from "@/components/vendor-review";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { Email, Vendor } from "@/lib/types";

export function Workspace({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [sendStates, setSendStates] = useState<
    Partial<Record<string, SendState>>
  >({});

  function updateVendor(updated: Vendor) {
    if (
      vendors.find((vendor) => vendor.id === updated.id)?.followUpDraft !==
      updated.followUpDraft
    ) {
      setSendStates((current) => ({ ...current, [updated.id]: undefined }));
    }
    setVendors((current) =>
      current.map((vendor) => (vendor.id === updated.id ? updated : vendor)),
    );
  }

  async function sendEmail(vendorId: string, body: string) {
    setSendStates((current) => ({
      ...current,
      [vendorId]: { status: "sending" },
    }));
    try {
      const response = await fetch(`/api/vendors/${vendorId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      const email: Email = result.email;
      setVendors((current) =>
        current.map((vendor) =>
          vendor.id === vendorId
            ? {
                ...vendor,
                emails: [...vendor.emails, email],
                followUpDraft: "",
              }
            : vendor,
        ),
      );
      setSendStates((current) => ({
        ...current,
        [vendorId]: { status: "sent" },
      }));
    } catch (error) {
      setSendStates((current) => ({
        ...current,
        [vendorId]: {
          status: "error",
          message:
            error instanceof Error
              ? `Send failed: ${error.message}`
              : "Send failed.",
        },
      }));
    }
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              RFQ Desk
            </h1>
            <p className="text-xs text-muted-foreground">
              Vendor quote workspace
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {vendors.length} vendors
        </span>
      </header>

      <Tabs
        defaultValue={vendors[0].id}
        orientation="vertical"
        className="min-h-0 flex-1 flex-col gap-0 md:flex-row"
      >
        <EmailInbox vendors={vendors} />

        {vendors.map((vendor) => (
          <TabsContent
            key={vendor.id}
            value={vendor.id}
            className="flex min-h-0 min-w-0 flex-col"
          >
            <VendorReview
              vendor={vendor}
              onChange={updateVendor}
              onSend={(body) => sendEmail(vendor.id, body)}
              sendState={sendStates[vendor.id]}
            />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
