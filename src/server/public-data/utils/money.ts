export function parseKoreanMoneyToWon(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).replace(/,/g, "").trim();
  if (!raw) return null;

  if (raw.includes("억")) {
    const [eokPart, manPart = "0"] = raw.split("억");
    const eok = Number(eokPart.replace(/[^\d.]/g, "")) || 0;
    const man = Number(manPart.replace(/[^\d.]/g, "")) || 0;
    return Math.round(eok * 100_000_000 + man * 10_000);
  }

  const numeric = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return null;

  // 국토부 실거래가 금액은 보통 만원 단위 문자열이다.
  return Math.round(numeric * 10_000);
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}
