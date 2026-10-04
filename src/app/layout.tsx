import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RFQ Desk",
  description: "Vendor emails and quote data, side by side.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
