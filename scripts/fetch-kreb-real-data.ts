import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

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
  rawFile: "kreb_region_index_raw.csv",
  outputFile: "data/fusion/kreb_region_index_real.csv",
  requiredColumns: ["month", "region", "lawdCode5", "saleIndex", "rentIndex", "saleMom", "rentMom", "volatilityScore"]
};

main(spec).catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main(input: ProviderSpec) {
  const source = process.env[input.envName];
  if (!source) {
    console.log(JSON.stringify({ skipped: true, reason: `${input.envName} is empty` }, null, 2));
    return;
  }
  const csv = await loadSource(source);
  const normalized = normalizeCsv(csv, input.requiredColumns, source);
  mkdirSync(path.join(process.cwd(), input.rawDir), { recursive: true });
  writeFileSync(path.join(process.cwd(), input.rawDir, input.rawFile), csv);
  writeFileSync(path.join(process.cwd(), input.outputFile), normalized);
  console.log(JSON.stringify({ skipped: false, outputFile: input.outputFile, sourceUrl: source }, null, 2));
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
