import { Workspace } from "@/components/workspace";
import { getVendors } from "@/lib/server/email-store";

export default function Home() {
  // Start from the original dataset; replies and quote edits stay in React state.
  return <Workspace initialVendors={getVendors()} />;
}
