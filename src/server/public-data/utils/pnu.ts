export function normalizeBunJi(value: string | number | null | undefined): string {
  const raw = String(value ?? "0").trim();
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.length > 0 ? digits : "0";
  return normalized.padStart(4, "0").slice(-4);
}

export function buildPnu(params: {
  legalDongCode10: string;
  mountainFlag: "0" | "1";
  bun: string | number;
  ji: string | number;
}): string {
  if (!/^\d{10}$/.test(params.legalDongCode10)) {
    throw new Error("legalDongCode10 must be 10 digits");
  }

  return `${params.legalDongCode10}${params.mountainFlag}${normalizeBunJi(params.bun)}${normalizeBunJi(params.ji)}`;
}

export function splitPnu(pnu: string): {
  legalDongCode10: string;
  mountainFlag: "0" | "1";
  bun: string;
  ji: string;
} {
  if (!/^\d{19}$/.test(pnu)) {
    throw new Error("PNU must be 19 digits");
  }

  const mountainFlag = pnu.slice(10, 11);
  if (mountainFlag !== "0" && mountainFlag !== "1") {
    throw new Error("PNU mountain flag must be 0 or 1");
  }

  return {
    legalDongCode10: pnu.slice(0, 10),
    mountainFlag,
    bun: pnu.slice(11, 15),
    ji: pnu.slice(15, 19)
  };
}

export function parseJibun(value: string | null | undefined): {
  mountainFlag: "0" | "1";
  bun: string;
  ji: string;
} | null {
  if (!value) return null;
  const match = value.match(/(?:^|\s)(산\s*)?(\d+)(?:-(\d+))?(?:\s|$)/);
  if (!match) return null;

  return {
    mountainFlag: match[1] ? "1" : "0",
    bun: normalizeBunJi(match[2]),
    ji: normalizeBunJi(match[3] ?? "0")
  };
}
