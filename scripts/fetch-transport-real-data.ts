import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const requiredColumns = [
  "region",
  "legalDong",
  "lawdCode5",
  "complexName",
  "nearestStationDistanceM",
  "nearestBusStopDistanceM",
  "transitAccessibilityScore",
  "commuteAccessScore",
  "lifeSocAccessScore"
];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const source = process.env.TRANSPORT_SOURCE_URL ?? process.env.KMAAS_SOURCE_URL;
  if (!source) {
    console.log(JSON.stringify({ skipped: true, reason: "TRANSPORT_SOURCE_URL/KMAAS_SOURCE_URL is empty" }, null, 2));
    return;
  }
  const csv = await loadSource(source);
  const normalized = normalizeCsv(csv, source);
  mkdirSync(path.join(process.cwd(), "data/fusion/raw/transport"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "data/fusion/raw/transport/transport_access_raw.csv"), csv);
  writeFileSync(path.join(process.cwd(), "data/fusion/transport_access_real.csv"), normalized);
  console.log(JSON.stringify({ skipped: false, outputFile: "data/fusion/transport_access_real.csv", sourceUrl: source }, null, 2));
}

async function loadSource(source: string) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`);
    return response.text();
  }
  return readFileSync(path.resolve(process.cwd(), source), "utf8");
}

function normalizeCsv(csv: string, sourceUrl: string) {
  const [headerLine = "", ...lines] = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  for (const column of requiredColumns) {
    if (!headers.includes(column)) throw new Error(`Missing required column ${column}`);
  }
  const outputHeaders = [
    ...headers.filter((header) => header !== "provider" && header !== "sourceType" && header !== "sourceUrl" && header !== "checkedAt"),
    "provider",
    "sourceType",
    "sourceUrl",
    "checkedAt"
  ];
  const checkedAt = new Date().toISOString();
  const provider = process.env.KMAAS_SOURCE_URL ? "KMAAS" : "TRANSPORT";
  const rows = lines.filter(Boolean).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
    row.provider = row.provider || provider;
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
