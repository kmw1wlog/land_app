import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { KrebClient, type KrebNormalizedRegionIndex } from "@/server/public-data/fusion/krebClient";

type ProviderSpec = {
  envName: string;
  rawDir: string;
  rawFile: string;
  outputFile: string;
  requiredColumns: string[];
};

const spec: ProviderSpec = {
  envName: "KREB_SOURCE_URL",
  rawDir: "data/fusion/raw/kreb",
  rawFile: "kreb_region_index_raw.json",
  outputFile: "data/fusion/kreb_region_index_real.csv",
  requiredColumns: ["month", "region", "lawdCode5", "saleIndex", "rentIndex", "saleMom", "rentMom", "volatilityScore"]
};

main(spec).catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main(input: ProviderSpec) {
  const source = process.env[input.envName];
  const apiKey = process.env.KREB_API_KEY;
  if (apiKey) {
    const client = new KrebClient();
    const result = await client.fetchRegionIndexFromApi({
      apiKey,
      monthFrom: process.env.KREB_MONTH_FROM ?? process.env.TARGET_MONTH_FROM ?? "202501",
      monthTo: process.env.KREB_MONTH_TO ?? process.env.TARGET_MONTH_TO ?? "202604"
    });
    const rawJson = JSON.stringify(
      {
        checkedAt: result.checkedAt,
        sourceUrl: result.sourceUrl,
        saleTableId: result.saleTableId,
        rentTableId: result.rentTableId,
        monthFrom: result.monthFrom,
        monthTo: result.monthTo,
        regions: result.raw.regions
      },
      null,
      2
    );
    const normalized = rowsToCsv(result.rows);
    mkdirSync(path.join(process.cwd(), input.rawDir), { recursive: true });
    writeFileSync(path.join(process.cwd(), input.rawDir, input.rawFile), rawJson);
    writeFileSync(path.join(process.cwd(), input.outputFile), normalized);
    console.log(
      JSON.stringify(
        {
          skipped: false,
          mode: "rone_api",
          outputFile: input.outputFile,
          rawFile: path.join(input.rawDir, input.rawFile),
          rowCount: result.rows.length,
          sourceUrl: result.sourceUrl,
          sha256: sha256(normalized)
        },
        null,
        2
      )
    );
    return;
  }

  if (!source) {
    console.log(JSON.stringify({ skipped: true, reason: "KREB_API_KEY and KREB_SOURCE_URL are empty" }, null, 2));
    return;
  }
  const csv = await loadSource(source);
  const normalized = normalizeCsv(csv, input.requiredColumns, source);
  mkdirSync(path.join(process.cwd(), input.rawDir), { recursive: true });
  writeFileSync(path.join(process.cwd(), input.rawDir, "kreb_region_index_raw.csv"), csv);
  writeFileSync(path.join(process.cwd(), input.outputFile), normalized);
  console.log(JSON.stringify({ skipped: false, mode: "csv_source", outputFile: input.outputFile, sourceUrl: source, sha256: sha256(normalized) }, null, 2));
}

async function loadSource(source: string) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`);
    return response.text();
  }
  return readFileSync(path.resolve(process.cwd(), source), "utf8");
}

function normalizeCsv(csv: string, requiredColumns: string[], sourceUrl: string) {
  const [headerLine = "", ...lines] = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  for (const column of requiredColumns) {
    if (!headers.includes(column)) {
      throw new Error(`Missing required column ${column}`);
    }
  }
  const outputHeaders = [...headers.filter((header) => header !== "sourceType" && header !== "sourceUrl" && header !== "checkedAt"), "sourceType", "sourceUrl", "checkedAt"];
  const checkedAt = new Date().toISOString();
  const rows = lines
    .filter(Boolean)
    .map((line) => {
      const values = splitCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
      row.sourceType = "real";
      row.sourceUrl = row.sourceUrl || sourceUrl;
      row.checkedAt = row.checkedAt || checkedAt;
      return outputHeaders.map((header) => escapeCsv(row[header] ?? "")).join(",");
    });
  return [outputHeaders.join(","), ...rows].join("\n") + "\n";
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function escapeCsv(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

function rowsToCsv(rows: KrebNormalizedRegionIndex[]) {
  const headers = [
    "month",
    "region",
    "lawdCode5",
    "saleIndex",
    "rentIndex",
    "saleMom",
    "rentMom",
    "volatilityScore",
    "sourceType",
    "sourceUrl",
    "checkedAt"
  ] satisfies Array<keyof KrebNormalizedRegionIndex>;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(String(row[header] ?? ""))).join(","))
  ].join("\n") + "\n";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
