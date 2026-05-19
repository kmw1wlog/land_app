export function monthRange(from: string, to: string): string[] {
  if (!/^\d{6}$/.test(from) || !/^\d{6}$/.test(to)) {
    throw new Error("monthRange expects YYYYMM strings");
  }

  const result: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(4, 6));
  const endYear = Number(to.slice(0, 4));
  const endMonth = Number(to.slice(4, 6));

  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(`${year}${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}
