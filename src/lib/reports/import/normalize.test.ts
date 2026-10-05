import { describe, expect, it } from "vitest";
import { normalizeImportFile } from "@/lib/reports/import/normalize";

describe("normalizeImportFile", () => {
  it("maps Haus daily sales CSV", () => {
    const csv = `fecha,pedidos,total_minor,total
2024-06-01,2,50000,$500
2024-06-02,1,28000,$280`;

    const result = normalizeImportFile({
      filename: "ventas.csv",
      content: csv,
    });

    expect(result.profile).toBe("haus_daily_sales");
    expect(result.sales).toHaveLength(3);
    expect(result.sales.reduce((s, row) => s + row.totalMinor, 0)).toBe(78000);
  });

  it("maps Haus order detail CSV into grouped sales", () => {
    const csv = `pedido,fecha,mesa,pago,producto,cantidad,linea_minor,linea
101,2024-06-03,M1,cash,Burger,2,56000,$560
101,2024-06-03,M1,cash,Beer,1,12000,$120`;

    const result = normalizeImportFile({
      filename: "detalle.csv",
      content: csv,
    });

    expect(result.profile).toBe("haus_orders_detail");
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]?.totalMinor).toBe(68000);
    expect(result.sales[0]?.items).toHaveLength(2);
  });

  it("reads simple XML sale blocks", () => {
    const xml = `<?xml version="1.0"?>
<root>
  <venta>
    <fecha>2024-05-10</fecha>
    <producto>Café</producto>
    <cantidad>2</cantidad>
    <total>12000</total>
  </venta>
</root>`;

    const result = normalizeImportFile({
      filename: "legacy.xml",
      content: xml,
    });

    expect(result.fileFormat).toBe("xml");
    expect(result.sales.length).toBeGreaterThan(0);
    expect(result.sales[0]?.items[0]?.productName).toBe("Café");
  });
});
