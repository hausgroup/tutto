"use server";

import { buildStationTicketPrintPayloadForUser } from "@/lib/printing/station-ticket-service";

export type PrintStationTicketsState = {
  error?: string;
  combinedPdfBase64?: string;
  stationPdfs?: Array<{
    station: "kitchen" | "bar";
    pdfBase64: string;
  }>;
};

export async function printStationTicketsAction(input: {
  orderId: string;
  itemIds?: string[];
  reprint?: boolean;
}): Promise<PrintStationTicketsState> {
  const result = await buildStationTicketPrintPayloadForUser(input);
  if (result.error) return { error: result.error };
  if (!result.print) return {};
  return {
    combinedPdfBase64: result.print.combinedPdfBase64,
    stationPdfs: result.print.stationPdfs,
  };
}
