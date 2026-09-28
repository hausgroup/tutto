import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { StationTicket } from "@/lib/printing/station-ticket";

/** ~80mm thermal roll width in PDF points. */
const PAGE_WIDTH = 226;
const MARGIN = 14;
const LINE_HEIGHT = 14;

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font });
      cursorY -= LINE_HEIGHT;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font });
    cursorY -= LINE_HEIGHT;
  }
  return cursorY;
}

async function renderTicketPage(
  doc: PDFDocument,
  ticket: StationTicket,
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  const estimatedHeight =
    120 + ticket.lines.length * (LINE_HEIGHT * 3) + ticket.lines.length * 8;
  const page = doc.addPage([PAGE_WIDTH, Math.max(320, estimatedHeight)]);

  let y = page.getHeight() - MARGIN;

  page.drawText("HAUS", {
    x: MARGIN,
    y,
    size: 10,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= LINE_HEIGHT;

  page.drawText(ticket.title.toUpperCase(), {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
  });
  y -= LINE_HEIGHT * 1.4;

  if (ticket.reprint) {
    page.drawText("REIMPRESIÓN", {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.55, 0.35, 0.1),
    });
    y -= LINE_HEIGHT;
  }

  const meta = [
    ticket.tableLabel ? `Mesa ${ticket.tableLabel}` : "Para llevar",
    `Pedido #${ticket.orderNumber}`,
    new Date(ticket.sentAt).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  ];
  for (const row of meta) {
    page.drawText(row, { x: MARGIN, y, size: 10, font });
    y -= LINE_HEIGHT;
  }

  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= LINE_HEIGHT;

  for (const line of ticket.lines) {
    const headline = `${line.quantity}× ${line.name}`;
    y = drawWrappedText(
      page,
      headline,
      MARGIN,
      y,
      contentWidth,
      12,
      fontBold,
    );

    if (line.note) {
      const isComida = line.note.startsWith("Comida");
      y = drawWrappedText(
        page,
        line.note,
        MARGIN + 8,
        y,
        contentWidth - 8,
        isComida ? 11 : 10,
        isComida ? fontBold : font,
      );
    }
    for (const mod of line.modifiers) {
      y = drawWrappedText(
        page,
        `+ ${mod}`,
        MARGIN + 8,
        y,
        contentWidth - 8,
        10,
        font,
      );
    }
    y -= 4;
  }

  y -= 4;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= LINE_HEIGHT;
  page.drawText(`Impresora: ${ticket.title}`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}

export async function buildStationTicketsPdf(
  tickets: StationTicket[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const ticket of tickets) {
    await renderTicketPage(doc, ticket);
  }
  return doc.save();
}

export async function buildPerStationTicketPdfs(
  tickets: StationTicket[],
): Promise<Array<{ station: StationTicket["station"]; bytes: Uint8Array }>> {
  const out: Array<{ station: StationTicket["station"]; bytes: Uint8Array }> =
    [];
  for (const ticket of tickets) {
    const doc = await PDFDocument.create();
    await renderTicketPage(doc, ticket);
    out.push({ station: ticket.station, bytes: await doc.save() });
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
