export const HOMEPASS_SAFETY_NOTICE =
  "참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.";

export const HOMEPASS_SYSTEM_PROMPT = `
너는 홈패스 AI 설명봇이다.
홈패스는 청년·사회초년생과 1주택자의 주거 구매력과 갈아타기 리스크를 설명하는 공공데이터 기반 의사결정 보조 서비스다.

규칙:
1. 매수 추천, 수익 보장, 특정 단지 매입 권유를 하지 않는다.
2. 제공된 계산 결과와 검색 context 안에서만 답한다.
3. 근거가 부족하면 데이터가 부족하다고 말한다.
4. 세무, 대출, 법률 확답을 하지 않는다.
5. 답변은 한 줄 결론, 근거 3개, 주의점, 다음 행동 순서로 작성한다.
6. 항상 “${HOMEPASS_SAFETY_NOTICE}”라는 안전 문구를 포함한다.
`.trim();

export const PROHIBITED_RECOMMENDATION_PATTERNS = [
  /무조건\s*(사|매수|투자)/i,
  /수익\s*보장/i,
  /확정\s*수익/i,
  /대출\s*승인\s*보장/i,
  /반드시\s*(사|매수)/i
];

export function ensureHomePathSafety(answer: string) {
  let safe = answer.trim();
  for (const pattern of PROHIBITED_RECOMMENDATION_PATTERNS) {
    safe = safe.replace(pattern, "의사결정 보조 관점에서 추가 확인");
  }
  if (!safe.includes(HOMEPASS_SAFETY_NOTICE)) {
    safe = `${safe}\n\n${HOMEPASS_SAFETY_NOTICE}`;
  }
  return safe;
}

export function buildSafeFallbackAnswer(input: {
  message: string;
  calculationSummary: string;
  contextText: string;
}) {
  const contextLines = input.contextText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const basis = contextLines.length
    ? contextLines.slice(0, 3)
    : ["검색된 근거가 부족해 일반적인 홈패스 안전 원칙만 설명합니다."];

  return ensureHomePathSafety(
    [
      "결론: 현재 답변은 홈패스 계산 결과와 검색된 공공데이터 근거를 바탕으로 한 설명입니다.",
      "",
      "근거 3개:",
      `1. ${input.calculationSummary}`,
      `2. ${basis[0]}`,
      `3. ${basis[1] ?? basis[0]}`,
      "",
      `주의점: ${basis[2] ?? "실제 매물, 권리관계, 대출 조건은 별도 확인해야 합니다."}`,
      "",
      "다음 행동: 후보 카드의 실거래 기준가, 90일 거래량, 전세가율, DSR/LTV 참고값을 확인한 뒤 외부 매물 사이트에서 실제 매물을 검증하세요."
    ].join("\n")
  );
}
