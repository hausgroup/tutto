export type XmlRecord = Record<string, string>;

function stripNs(tag: string) {
  const parts = tag.split(":");
  return parts[parts.length - 1] ?? tag;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Lightweight XML → flat records (one record per repeated child block). */
export function parseXmlToRecords(xml: string): XmlRecord[] {
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<")) return [];

  const blockTags = [
    "venta",
    "ventas",
    "factura",
    "facturas",
    "invoice",
    "invoices",
    "sale",
    "sales",
    "documento",
    "registro",
    "row",
    "item",
    "linea",
    "line",
    "detalle",
  ];

  const records: XmlRecord[] = [];

  for (const tag of blockTags) {
    const re = new RegExp(
      `<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`,
      "gi",
    );
    let match: RegExpExecArray | null;
    while ((match = re.exec(trimmed)) !== null) {
      const inner = match[1] ?? "";
      const record = extractFields(inner);
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }
    if (records.length > 0) break;
  }

  if (records.length === 0) {
    const record = extractFields(trimmed);
    if (Object.keys(record).length > 0) records.push(record);
  }

  return records;
}

function extractFields(fragment: string): XmlRecord {
  const record: XmlRecord = {};
  const re = /<(?:([\w-]+):)?([\w.-]+)[^>]*>([^<]*)<\//gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(fragment)) !== null) {
    const key = stripNs(match[2] ?? "").toLowerCase();
    const value = decodeXmlEntities((match[3] ?? "").trim());
    if (!key || !value) continue;
    if (record[key] && record[key] !== value) {
      record[`${key}_2`] = value;
    } else {
      record[key] = value;
    }
  }
  return record;
}
