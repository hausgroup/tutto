import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { Ingredient } from "@/lib/inventory/types";
import { formatCurrency } from "@/lib/utils/money";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const ROW_HEIGHT = 16;
const HEADER_ROW = 20;
const FOOTER_Y = MARGIN - 24;

type Column = { title: string; width: number };

const COLUMNS: Column[] = [
  { title: "Insumo", width: 132 },
  { title: "Stock", width: 58 },
  { title: "Unid.", width: 36 },
  { title: "Mín.", width: 44 },
  { title: "Estado", width: 72 },
  { title: "Costo/u", width: 72 },
  { title: "Valor", width: 76 },
];

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

function formatStockQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function ingredientStatus(ingredient: Ingredient): string {
  if (!ingredient.isActive) return "Inactivo";
  if (ingredient.stockQuantity <= ingredient.minStockQuantity) {
    return "Bajo mín.";
  }
  return "OK";
}

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
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    x += col.width;
  }
  const lineY = y - 5;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1,
    color: rgb(0.75, 0.75, 0.75),
  });
  return lineY - HEADER_ROW;
}

function rowCells(ingredient: Ingredient): string[] {
  const stockValueMinor = Math.round(
    ingredient.stockQuantity * ingredient.costMinorPerUnit,
  );
  return [
    ingredient.name,
    formatStockQty(ingredient.stockQuantity),
    ingredient.unit,
    formatStockQty(ingredient.minStockQuantity),
    ingredientStatus(ingredient),
    formatCurrency(ingredient.costMinorPerUnit),
    formatCurrency(stockValueMinor),
  ];
}

export async function buildInventoryListPdf(input: {
  restaurantName: string;
  ingredients: Ingredient[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const generatedAt = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const sorted = [...input.ingredients].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  const activeCount = sorted.filter((item) => item.isActive).length;
  const lowCount = sorted.filter(
    (item) => item.isActive && item.stockQuantity <= item.minStockQuantity,
  ).length;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText("Inventario de insumos", {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  page.drawText(input.restaurantName, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 14;

  page.drawText(
    `Generado: ${generatedAt} · ${sorted.length} insumo${sorted.length === 1 ? "" : "s"} (${activeCount} activos, ${lowCount} bajo mínimo)`,
    {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    },
  );
  y -= 22;

  y = drawTableHeader(page, y, fontBold);

  const minY = MARGIN + 36;

  for (const ingredient of sorted) {
    if (y < minY) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 8;
      y = drawTableHeader(page, y, fontBold);
    }

    const cells = rowCells(ingredient);
    let x = MARGIN;
    for (let i = 0; i < COLUMNS.length; i += 1) {
      const col = COLUMNS[i]!;
      const text = truncate(cells[i] ?? "", font, 8, col.width - 4);
      page.drawText(text, {
        x,
        y,
        size: 8,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      x += col.width;
    }
    y -= ROW_HEIGHT;
  }

  if (sorted.length === 0) {
    page.drawText("No hay insumos en el inventario.", {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  const pageCount = doc.getPageCount();
  for (let i = 0; i < pageCount; i += 1) {
    const p = doc.getPage(i);
    p.drawText(
      `${input.restaurantName} · Inventario · Hoja ${i + 1} de ${pageCount}`,
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
