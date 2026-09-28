import type { Metadata } from "next";
import { PosClientEntry } from "@/components/pos/pos-client-entry";

export const metadata: Metadata = { title: "POS" };

export default async function PosTablePage({
  params,
  searchParams,
}: PageProps<"/pos/[tableId]">) {
  const { tableId } = await params;
  const query = await searchParams;
  const tableLabel =
    typeof query.t === "string" && query.t.trim() ? query.t.trim() : tableId;

  // No server data fetch — client paints from warm cache / in-flight bootstrap.
  return <PosClientEntry tableId={tableId} tableLabel={tableLabel} />;
}
