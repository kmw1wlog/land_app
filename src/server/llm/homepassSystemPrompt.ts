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
  /매수\s*추천(?:이\s*될\s*가능성이\s*높습니다|이\s*될\s*가능성|입니다|으로\s*볼\s*수\s*있습니다)?/gi,
  /무조건\s*(사|매수|투자)/gi,
  /수익\s*보장/gi,
  /확정\s*수익/gi,
  /대출\s*승인\s*보장/gi,
  /반드시\s*(사|매수)/gi
];

export function ensureHomePathSafety(answer: string) {
  let safe = answer.trim();
  for (const pattern of PROHIBITED_RECOMMENDATION_PATTERNS) {
    safe = safe.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      const fullText = args[args.length - 1] as string;
      return isNegatedSafetyContext(fullText, offset) ? match : "참고 신호";
    });
  }
  safe = safe
    .replace(/참고 신호이/g, "참고 신호로")
    .replace(/참고 신호을/g, "참고 신호를");
  if (!safe.includes(HOMEPASS_SAFETY_NOTICE)) {
    safe = `${safe}\n\n${HOMEPASS_SAFETY_NOTICE}`;
  }
  return safe;
}

function isNegatedSafetyContext(text: string, offset: number) {
  const tail = text.slice(offset, offset + 90);
  const sameClause = tail.split(/[.\n;]/)[0] ?? tail;
  return /아닙니다|아니며|아닌|하지\s*않|하지\s*않는다|하지\s*않습니다|금지|보장하지\s*않/.test(sameClause);
}

export function buildSafeFallbackAnswer(input: {
  message: string;
  calculationSummary: string;
  contextText: string;
}) {
  const sections = splitContextSections(input.contextText);
  const candidateBasis = pickSectionSummary(sections, [
    "현재 후보",
    "후보 실거래 지표",
    "최근 실거래",
    "거래 집중도",
    "전세가율"
  ]);
  const aiBasis = pickSectionSummary(sections, [
    "Transformer AI 신호",
    "AI 후보점수",
    "회복 확률",
    "거래 재활성화",
    "하락 리스크"
  ]);
  const safetyBasis = pickSectionSummary(sections, [
    "안전 정책",
    "매수 추천",
    "수익 보장",
    "대출 승인",
    "의사결정 보조"
  ]);

  return ensureHomePathSafety(
    [
      "결론: 현재 답변은 매수 판단이 아니라 홈패스 계산 결과와 검색된 공공데이터 근거를 묶은 참고 설명입니다.",
      "",
      "근거 1: 구매력 계산",
      input.calculationSummary,
      "",
      "근거 2: 후보 실거래 지표",
      candidateBasis ?? "후보 단지의 기준가, 거래량, 전세가율, 전고점 대비 흐름을 확인할 근거가 충분하지 않습니다.",
      "",
      "근거 3: Transformer AI 신호",
      aiBasis ?? "현재 검색 context에서 후보와 직접 연결된 Transformer 신호가 부족합니다.",
      "",
      `주의점: ${safetyBasis ?? "실제 매물, 권리관계, 대출 조건은 별도 확인해야 합니다."}`,
      "",
      "다음 행동: 후보 카드의 실거래 기준가, 90일 거래량, 전세가율, DSR/LTV 참고값을 확인한 뒤 외부 매물 사이트에서 실제 매물을 검증하세요."
    ].join("\n")
  );
}

function splitContextSections(contextText: string) {
  return contextText
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function pickSectionSummary(sections: string[], keywords: string[]) {
  const section = sections.find((item) => keywords.some((keyword) => item.includes(keyword)));
  if (!section) return undefined;
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, ""));
  const meaningful = lines.find((line) => /기준가|거래|전세|후보|AI|회복|리스크|보조|추천|수익|대출/.test(line)) ?? lines[0];
  return meaningful ? limitSentence(meaningful) : undefined;
}

function limitSentence(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}
