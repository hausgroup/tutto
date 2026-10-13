import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { RESTAURANT_TIME_ZONE } from "@/lib/floor/reservation-time";
import {
  formatDayHeading,
  type ReservationOverviewItem,
} from "@/lib/floor/reservations-overview";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const ROW_HEIGHT = 18;
const HEADER_ROW = 22;
const FOOTER_Y = MARGIN - 24;

function formatTimeForHost(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function truncate(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

type Column = { title: string; width: number };

const COLUMNS: Column[] = [
  { title: "Hora", width: 52 },
  { title: "Huésped", width: 118 },
  { title: "Pax", width: 32 },
  { title: "Ocasión", width: 108 },
  { title: "Mesas", width: 72 },
  { title: "Zona", width: 95 },
];

function drawTableHeader(
  page: PDFPage,
  y: number,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  let x = MARGIN;
  for (const col of COLUMNS) {
    page.drawText(col.title, {
      x,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    x += col.width;
  }
  const lineY = y - 6;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1,
    color: rgb(0.75, 0.75, 0.75),
  });
  return lineY - HEADER_ROW;
}

function rowCells(item: ReservationOverviewItem): string[] {
  const tables = item.tables.map((t) => t.label).join(", ");
  const zones = [...new Set(item.tables.map((t) => t.areaName))].join(", ");
  return [
    formatTimeForHost(item.scheduledAt),
    item.guestName,
    String(item.partySize),
    item.occasion || "—",
    tables || "—",
    zones || "—",
  ];
}

export async function buildHostReservationsDayPdf(input: {
  restaurantName: string;
  ymd: string;
  items: ReservationOverviewItem[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { label, weekdayLabel } = formatDayHeading(input.ymd);
  const title = `Reservas — ${weekdayLabel}, ${label}`;
  const generatedAt = new Intl.DateTimeFormat("es-CO", {
    timeZone: RESTAURANT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const sorted = [...input.items].sort((a, b) => {
    const ta = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.POSITIVE_INFINITY;
    const tb = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  const totalGuests = sorted.reduce((sum, item) => sum + item.partySize, 0);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(title, {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
  });
  y -= 20;

  page.drawText(input.restaurantName, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 16;

  page.drawText(`Para equipo de host · Generado ${generatedAt}`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  y -= 18;

  page.drawText(
    sorted.length === 0
      ? "No hay reservas programadas para este día."
      : `${sorted.length} ${sorted.length === 1 ? "reserva" : "reservas"} · ${totalGuests} comensales`,
    {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
    },
  );
  y -= 28;

  if (sorted.length > 0) {
    y = drawTableHeader(page, y, fontBold);

    for (const item of sorted) {
      const needsExtra = item.partySize > item.totalCapacity;
      const blockHeight = needsExtra ? ROW_HEIGHT + 10 : ROW_HEIGHT;

      if (y - blockHeight < MARGIN + 32) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        y = drawTableHeader(page, y, fontBold);
      }

      const cells = rowCells(item);
      let x = MARGIN;
      for (let i = 0; i < COLUMNS.length; i += 1) {
        const col = COLUMNS[i]!;
        const raw = cells[i] ?? "";
        const text = truncate(raw, font, 9, col.width - 4);
        page.drawText(text, {
          x,
          y,
          size: 9,
          font: i === 0 || i === 2 ? fontBold : font,
          color: rgb(0.1, 0.1, 0.1),
        });
        x += col.width;
      }

      if (needsExtra) {
        y -= 10;
        page.drawText(
          truncate(
            `Capacidad en mesas: ${item.totalCapacity} (grupo ${item.partySize})`,
            font,
            8,
            PAGE_WIDTH - MARGIN * 2 - COLUMNS[0]!.width,
          ),
          {
            x: MARGIN + COLUMNS[0]!.width,
            y,
            size: 8,
            font,
            color: rgb(0.55, 0.35, 0.1),
          },
        );
      }

      y -= ROW_HEIGHT;
    }
  }

  const pageCount = doc.getPageCount();
  for (let i = 0; i < pageCount; i += 1) {
    const p = doc.getPage(i);
    p.drawText(
      `${input.restaurantName} · Hoja ${i + 1} de ${pageCount}`,
      {
        x: MARGIN,
        y: FOOTER_Y,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.45),
      },
    );
  }

  return doc.save();
}
