export const HOMEPASS_SAFETY_NOTICE =
  "참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.";

export const HOMEPASS_SYSTEM_PROMPT = `
너는 홈패스 AI 설명봇이다.
홈패스는 청년·사회초년생과 1주택자의 주거 구매력과 갈아타기 리스크를 설명하는 공공데이터 기반 의사결정 보조 서비스다.

규칙:
1. 매수 추천, 수익 보장, 특정 단지 매입 권유를 하지 않는다.
2. 제공된 계산 결과와 검색 context 안에서만 답한다.
3. 사용자 상황 context와 관심 주택 context가 있으면 반드시 먼저 반영하고, TurboQuant RAG로 찾은 다른 주택은 비교 근거로 설명한다.
4. 근거가 부족하면 데이터가 부족하다고 말한다.
5. 세무, 대출, 법률 확답을 하지 않는다.
6. 답변은 한 줄 결론, 근거 3개, 주의점, 다음 행동 순서로 작성한다.
7. 항상 “${HOMEPASS_SAFETY_NOTICE}”라는 안전 문구를 포함한다.
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
  const userBasis = pickSourceSummary(sections, "사용자 상황/관심 주택", [
    "사용자 상황",
    "관심 주택",
    "월소득",
    "현재 집",
    "관심에 담은"
  ]);
  const candidateBasis = pickSourceSummary(sections, "후보 실거래 지표", [
    "현재 후보",
    "최근 실거래",
    "거래 집중도",
    "전세가율",
    "전고점 대비"
  ]);
  const aiBasis = pickSourceSummary(sections, "Transformer AI 신호", [
    "AI 후보점수",
    "회복 확률",
    "거래 재활성화",
    "하락 리스크"
  ]);
  const safetyBasis = pickSourceSummary(sections, "안전 정책", [
    "매수 추천",
    "수익 보장",
    "대출 승인",
    "의사결정 보조"
  ]);

  return ensureHomePathSafety(
    [
      "결론: 현재 후보는 입력 조건과 계산 결과를 기준으로 현재 가능, 정리 후 가능, 미래 준비 중 어디에 가까운지 설명해야 하는 참고 후보입니다.",
      "",
      "근거 3개:",
      `1. 구매력 계산 근거: ${userBasis ?? input.calculationSummary}`,
      `2. 실거래/전세가율/거래량 근거: ${candidateBasis ?? "후보 단지의 가격, 거래량, 전세가율, 전고점 대비 흐름을 확인할 검색 근거가 충분하지 않습니다."}`,
      `3. Transformer AI 신호 근거: ${aiBasis ?? "현재 검색 context에서 후보와 직접 연결된 회복 확률, 거래 재활성화, 하락 리스크 신호가 부족합니다."}`,
      "",
      `주의점: ${safetyBasis ?? "이 결과는 매수 추천이 아니며, 실제 매물·대출·세금은 외부 확인이 필요합니다."}`,
      "",
      "다음 행동: 같은 예산 비교 / 주거 경로 보기 / 커뮤니티 질문 / 외부 매물 확인 중 하나로 이어가세요."
    ].join("\n")
  );
}

function splitContextSections(contextText: string) {
  return contextText
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function pickSourceSummary(sections: string[], sourceLabel: string, keywords: string[]) {
  const section = sections.find((item) => item.includes(sourceLabel) || keywords.some((keyword) => item.includes(keyword)));
  if (!section) return undefined;
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, ""))
    .filter((line) => !/^score=|^sourceTypes:|^RAG 검색 요약/.test(line));
  const meaningful = lines.find((line) => /월소득|월저축|현금|현재 집|관심 주택|기준가|가격|거래|전세|전고점|후보점수|회복|재활성화|하락|보조|추천|수익|대출/.test(line));
  return meaningful ? limitSentence(meaningful) : undefined;
}

function limitSentence(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}
