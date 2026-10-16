/**
 * Import temp/menu_haus.csv into product_categories + products.
 *
 *   node scripts/import-menu-haus.mjs           # upsert via Supabase
 *   node scripts/import-menu-haus.mjs --sql-only  # write database/seed-menu-haus.sql
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(ROOT, "temp", "menu_haus.csv");
const SQL_PATH = join(ROOT, "database", "seed-menu-haus.sql");

const DEFAULT_RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";
const SKU_PREFIX = "HAUS";
const TAX_RATE_BPS = 800;

const BAR_CATEGORIES = new Set([
  "Cocktails",
  "Bebidas",
  "Sodas",
  "Cervezas",
  "Vinos",
  "Sangrías",
]);
const DESSERT_CATEGORIES = new Set(["Postres"]);

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(ROOT, name), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i]?.trim() ?? "";
    });
    return row;
  });
}

function parseCop(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}

function stationForCategory(name) {
  if (BAR_CATEGORIES.has(name)) return "bar";
  if (DESSERT_CATEGORIES.has(name)) return "dessert";
  return "kitchen";
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 24);
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function categoryId(index) {
  const n = String(index).padStart(3, "0");
  return `55555555-5555-4555-8555-555555557${n}`;
}

function productId(index) {
  const suffix = String(666_613_000_000 + index).padStart(12, "0");
  return `66666666-6666-4666-8666-${suffix}`;
}

function buildMenu(restaurantId) {
  const raw = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(raw);

  const categoryOrder = [];
  const categoryIndex = new Map();
  for (const row of rows) {
    const cat = row.categoria?.trim();
    if (!cat || categoryIndex.has(cat)) continue;
    categoryIndex.set(cat, categoryOrder.length);
    categoryOrder.push(cat);
  }

  const categories = categoryOrder.map((name, i) => ({
    id: categoryId(i + 1),
    restaurantId,
    name,
    sortOrder: i + 1,
    preparationStation: stationForCategory(name),
  }));

  const products = [];
  let productSeq = 0;
  const skuCount = new Map();

  for (const row of rows) {
    const categoryName = row.categoria?.trim();
    if (!categoryName) continue;

    const name = row.producto?.trim();
    if (!name) continue;

    let priceMinor =
      parseCop(row.precio_cop) ?? parseCop(row.precio_alternativo_cop);
    if (priceMinor == null) {
      console.warn(`Skipping "${name}" — no price`);
      continue;
    }

    productSeq += 1;
    const catIdx = categoryIndex.get(categoryName);
    const categoryIdValue = categoryId(catIdx + 1);

    let description = row.descripcion?.trim() || null;
    const altPrice = parseCop(row.precio_alternativo_cop);
    const primary = parseCop(row.precio_cop);
    if (altPrice != null && primary != null && altPrice !== primary) {
      const extra = `Precio regular: ${altPrice.toLocaleString("es-CO")} COP`;
      description = description ? `${description} (${extra})` : extra;
    }
    const notas = row.notas?.trim();
    if (notas) {
      description = description ? `${description} — ${notas}` : notas;
    }

    const slugBase = slugify(`${categoryName}-${name}`);
    const count = (skuCount.get(slugBase) ?? 0) + 1;
    skuCount.set(slugBase, count);
    const sku = `${SKU_PREFIX}-${slugBase}${count > 1 ? `-${count}` : ""}`;

    products.push({
      id: productId(productSeq),
      restaurantId,
      categoryId: categoryIdValue,
      name,
      description,
      sku,
      priceMinor,
      costMinor: 0,
      taxRateBps: TAX_RATE_BPS,
      preparationStation: stationForCategory(categoryName),
      trackInventory: false,
    });
  }

  return { categories, products };
}

function renderSql(restaurantId, { categories, products }) {
  const categoryIds = categories.map((c) => `'${c.id}'`).join(", ");
  const lines = [
    "-- Haus restaurant menu (generated from temp/menu_haus.csv)",
    `-- Restaurant: ${restaurantId}`,
    "-- Does not DELETE products (order_items may reference them). Legacy rows are deactivated.",
    "",
    "insert into public.product_categories (",
    "  id, restaurant_id, name, sort_order, preparation_station, is_active",
    ") values",
  ];

  const catValues = categories.map(
    (c) =>
      `  ('${c.id}', '${c.restaurantId}', '${sqlEscape(c.name)}', ${c.sortOrder}, '${c.preparationStation}', true)`,
  );
  lines.push(catValues.join(",\n"));
  lines.push("on conflict (id) do update set");
  lines.push(
    "  name = excluded.name,",
    "  sort_order = excluded.sort_order,",
    "  preparation_station = excluded.preparation_station,",
    "  is_active = excluded.is_active;",
    "",
    `update public.product_categories`,
    `set is_active = false`,
    `where restaurant_id = '${restaurantId}'`,
    `  and id not in (${categoryIds});`,
    "",
    "insert into public.products (",
    "  id, restaurant_id, category_id, name, description, sku,",
    "  price_minor, cost_minor, tax_rate_bps, preparation_station,",
    "  track_inventory, is_active, allergens",
    ") values",
  );

  const prodValues = products.map((p) => {
    const desc = p.description
      ? `'${sqlEscape(p.description)}'`
      : "null";
    return `  ('${p.id}', '${p.restaurantId}', '${p.categoryId}', '${sqlEscape(p.name)}', ${desc}, '${sqlEscape(p.sku)}', ${p.priceMinor}, ${p.costMinor}, ${p.taxRateBps}, '${p.preparationStation}', false, true, '{}')`;
  });
  lines.push(prodValues.join(",\n"));
  lines.push("on conflict (id) do update set");
  lines.push(
    "  category_id = excluded.category_id,",
    "  name = excluded.name,",
    "  description = excluded.description,",
    "  sku = excluded.sku,",
    "  price_minor = excluded.price_minor,",
    "  preparation_station = excluded.preparation_station,",
    "  track_inventory = excluded.track_inventory,",
    "  is_active = excluded.is_active;",
    "",
    `update public.products`,
    `set is_active = false`,
    `where restaurant_id = '${restaurantId}'`,
    `  and coalesce(sku, '') not like '${SKU_PREFIX}-%';`,
  );

  return `${lines.join("\n")}\n`;
}

async function importViaSupabase(restaurantId, menu) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const categoryRows = menu.categories.map((c) => ({
    id: c.id,
    restaurant_id: c.restaurantId,
    name: c.name,
    sort_order: c.sortOrder,
    preparation_station: c.preparationStation,
    is_active: true,
  }));
  const { error: catError } = await supabase
    .from("product_categories")
    .upsert(categoryRows, { onConflict: "id" });
  if (catError) throw catError;

  const categoryIds = menu.categories.map((c) => c.id);
  const categoryInList = `(${categoryIds.map((id) => `"${id}"`).join(",")})`;
  const { error: deactivateCats } = await supabase
    .from("product_categories")
    .update({ is_active: false })
    .eq("restaurant_id", restaurantId)
    .not("id", "in", categoryInList);
  if (deactivateCats) throw deactivateCats;

  const productRows = menu.products.map((p) => ({
    id: p.id,
    restaurant_id: p.restaurantId,
    category_id: p.categoryId,
    name: p.name,
    description: p.description,
    sku: p.sku,
    price_minor: p.priceMinor,
    cost_minor: p.costMinor,
    tax_rate_bps: p.taxRateBps,
    preparation_station: p.preparationStation,
    track_inventory: p.trackInventory,
    is_active: true,
    allergens: [],
  }));

  const batchSize = 50;
  for (let i = 0; i < productRows.length; i += batchSize) {
    const chunk = productRows.slice(i, i + batchSize);
    const { error } = await supabase.from("products").upsert(chunk, {
      onConflict: "id",
    });
    if (error) throw error;
  }

  const { error: deactivateNullSku } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("restaurant_id", restaurantId)
    .is("sku", null);
  if (deactivateNullSku) throw deactivateNullSku;

  const { error: deactivateLegacySku } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("restaurant_id", restaurantId)
    .not("sku", "ilike", `${SKU_PREFIX}-%`);
  if (deactivateLegacySku) throw deactivateLegacySku;

  console.log(
    `Imported ${menu.categories.length} categories and ${menu.products.length} products.`,
  );
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const sqlOnly = process.argv.includes("--sql-only");
  const restaurantId =
    process.env.RESTAURANT_ID?.trim() || DEFAULT_RESTAURANT_ID;

  const menu = buildMenu(restaurantId);
  const sql = renderSql(restaurantId, menu);
  writeFileSync(SQL_PATH, sql, "utf8");
  console.log(
    `Wrote ${SQL_PATH} (${menu.categories.length} categories, ${menu.products.length} products)`,
  );

  if (sqlOnly) return;

  await importViaSupabase(restaurantId, menu);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
