import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";

type LegalDongSeedRow = {
  code10: string;
  lawdCode5: string;
  sido?: string | null;
  sigungu?: string | null;
  eupmyeon?: string | null;
  ri?: string | null;
  fullName: string;
  isActive?: boolean;
  raw?: unknown;
};

const FALLBACK_CODES: LegalDongSeedRow[] = [
  {
    code10: "2726010100",
    lawdCode5: "27260",
    sido: "대구광역시",
    sigungu: "수성구",
    eupmyeon: "범어동",
    fullName: "대구광역시 수성구 범어동"
  },
  {
    code10: "1120011400",
    lawdCode5: "11200",
    sido: "서울특별시",
    sigungu: "성동구",
    eupmyeon: "성수동1가",
    fullName: "서울특별시 성동구 성수동1가"
  }
];

export async function seedLegalDongCodes(lawdCodes?: string[], sourcePath = process.env.LEGAL_DONG_CSV_PATH) {
  const sourceRows: LegalDongSeedRow[] = sourcePath ? await readLegalDongCsv(sourcePath) : FALLBACK_CODES;
  const targets = lawdCodes && lawdCodes.length > 0 ? lawdCodes : undefined;
  const codes = targets
    ? sourceRows.filter((item) => targets.includes(item.lawdCode5))
    : sourceRows;

  const rows = [];
  for (let index = 0; index < codes.length; index += 250) {
    const chunk = codes.slice(index, index + 250);
    const result = await Promise.all(
      chunk.map((item) =>
        prisma.legalDongCode.upsert({
        where: { code10: item.code10 },
        update: {
          lawdCode5: item.lawdCode5,
          sido: item.sido,
          sigungu: item.sigungu,
          eupmyeon: item.eupmyeon,
          ri: item.ri ?? null,
          fullName: item.fullName,
          isActive: item.isActive ?? true,
          raw: JSON.parse(JSON.stringify(item)) as Prisma.InputJsonValue
        },
        create: {
          ...item,
          isActive: item.isActive ?? true,
          raw: JSON.parse(JSON.stringify(item)) as Prisma.InputJsonValue
        }
        })
      )
    );
    rows.push(...result);
  }

  return {
    count: rows.length,
    rows: rows.slice(0, 100)
  };
}

export async function getLawdCodeForRegion(regionName: string) {
  const row = await prisma.legalDongCode.findFirst({
    where: {
      fullName: { contains: regionName },
      isActive: true
    },
    orderBy: { code10: "asc" }
  });
  return row?.lawdCode5 ?? null;
}

async function readLegalDongCsv(path: string) {
  const buffer = await readFile(path);
  const text = decodeLegalDongText(buffer);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = lines
    .slice(lines[0]?.includes("법정동코드") || lines[0]?.includes("code") ? 1 : 0)
    .map((line) => ({ line, parts: line.split(/,|\t/).map((part) => part.trim()) }))
    .filter(({ parts }) => /^\d{10}$/.test(parts[0] ?? ""))
    .map(({ line, parts }) => {
      const code10 = parts[0];
      const fullName = parts[1] || "";
      const status = parts[2] || "존재";
      const names = fullName.split(/\s+/);
      return {
        code10,
        lawdCode5: code10.slice(0, 5),
        sido: names[0] ?? null,
        sigungu: names[1] ?? null,
        eupmyeon: names[2] ?? null,
        ri: names.slice(3).join(" ") || null,
        fullName,
        isActive: !/폐지|말소|삭제/.test(status),
        raw: { source: path, line }
      };
    });

  return rows.length > 0 ? rows : FALLBACK_CODES;
}

function decodeLegalDongText(buffer: Buffer) {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("�") && utf8.includes("법정동")) return utf8;
  return new TextDecoder("euc-kr").decode(buffer);
}

export async function findLegalDongByAddress(inputAddress: string) {
  const parts = inputAddress
    .replace(/\d+(-\d+)?/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  const rows = await prisma.legalDongCode.findMany({
    where: {
      isActive: true,
      OR: parts.map((part) => ({ fullName: { contains: part } }))
    },
    take: 200
  });
  return rows
    .map((row) => ({
      row,
      score: parts.reduce((sum, part) => sum + (row.fullName.includes(part) ? part.length : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || b.row.fullName.length - a.row.fullName.length)[0]?.row ?? null;
}
