import { parseCsv } from "./csv.js";

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function number(value, field, minimum = 0) {
  if (value === undefined || value === null || value === "") return minimum;
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`"${field}" must be a number >= ${minimum}.`);
  }
  return parsed;
}

// Case-insensitive and space/underscore-insensitive property getter
function getField(row, keys) {
  const normalizedRow = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.toLowerCase().replace(/[\s_-]+/g, "");
    normalizedRow[cleanKey] = v;
  }
  for (const key of keys) {
    const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, "");
    if (cleanKey in normalizedRow) {
      return normalizedRow[cleanKey];
    }
  }
  return undefined;
}

const SCHEMAS = {
  artifacts: {
    parse: (row) => ({
      typeId: getField(row, ["typeId", "type_id", "type id", "id"]) || "",
      name: getField(row, ["name"]) || "",
      symbol: getField(row, ["symbol"]) || "📦",
      clickBonus: number(getField(row, ["clickBonus", "click_bonus", "click bonus", "click"]), "clickBonus", 0),
      dpsBonus: number(getField(row, ["dpsBonus", "dps_bonus", "dps bonus", "dps"]), "dpsBonus", 0),
      layer: number(getField(row, ["layer"]), "layer", 1),
      rarity: getField(row, ["rarity"]) || "Common",
      desc: getField(row, ["desc", "description", "details"]) || "",
    }),
  },
  shop: {
    parse: (row) => ({
      id: getField(row, ["id", "typeId", "type_id", "type id"]) || "",
      name: getField(row, ["name"]) || "",
      clickBonus: number(getField(row, ["clickBonus", "click_bonus", "click bonus", "click"]), "clickBonus", 0),
      dpsBonus: number(getField(row, ["dpsBonus", "dps_bonus", "dps bonus", "dps"]), "dpsBonus", 0),
      layer: number(getField(row, ["layer"]), "layer", 1),
      desc: getField(row, ["desc", "description", "details"]) || "",
    }),
  },
  meals: {
    parse: (row) => ({
      id: getField(row, ["id", "typeId", "type_id", "type id"]) || "",
      name: getField(row, ["name"]) || "",
      symbol: getField(row, ["symbol"]) || "🍲", // <--- Added symbol parsing
      price: number(getField(row, ["price", "value"]), "price", 0),
      dpsBuff: number(getField(row, ["dpsBuff", "dps_buff", "dps buff", "buff"]), "dpsBuff", 0),
      desc: getField(row, ["desc", "description", "details"]) || "",
    }),
  },
};

function validateRows(category, rows) {
  const schema = SCHEMAS[category];
  return rows.map((row, index) => {
    try {
      return schema.parse(row);
    } catch (error) {
      throw new Error(`${category} row ${index + 2}: ${error.message}`);
    }
  });
}

export async function loadGameContent(urls, fetchImpl = globalThis.fetch) {
  const categories = Object.keys(SCHEMAS);
  const entries = await Promise.all(categories.map(async (category) => {
    const url = new URL(urls[category]);
    url.searchParams.set("_", String(Date.now()));
    const response = await fetchImpl(url.href, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load the ${category} sheet (HTTP ${response.status}).`);
    }
    const text = await response.text();
    const rows = parseCsv(text);
    return [category, validateRows(category, rows)];
  }));

  return Object.fromEntries(entries);
}