"use client";

export type StationPdfJob = {
  station: "kitchen" | "bar";
  pdfBase64: string;
};

const STATION_LABEL: Record<StationPdfJob["station"], string> = {
  kitchen: "Cocina",
  bar: "Bar",
};

function base64ToBlob(base64: string, mime = "application/pdf"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function printBlob(blob: Blob, title: string): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.title = title;
    iframe.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      const onAfterPrint = () => {
        win.removeEventListener("afterprint", onAfterPrint);
        cleanup();
      };
      win.addEventListener("afterprint", onAfterPrint);
      win.focus();
      win.print();
      window.setTimeout(cleanup, 60_000);
    };

    document.body.appendChild(iframe);
  });
}

export function openCombinedTicketPdf(base64: string): void {
  const url = URL.createObjectURL(base64ToBlob(base64));
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Opens the combined PDF, then one print dialog per station (Cocina / Bar). */
export async function printStationTicketPdfs(input: {
  combinedPdfBase64?: string;
  stationPdfs?: StationPdfJob[];
}): Promise<void> {
  if (input.combinedPdfBase64) {
    openCombinedTicketPdf(input.combinedPdfBase64);
  }
  if (!input.stationPdfs?.length) return;

  for (const job of input.stationPdfs) {
    await printBlob(
      base64ToBlob(job.pdfBase64),
      `Ticket ${STATION_LABEL[job.station]}`,
    );
  }
}
