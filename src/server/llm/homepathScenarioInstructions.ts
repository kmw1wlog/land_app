import type { ComplexSignalCandidate, CurrentHome, UserFinancialPlan, UserProfile } from "@/types";
import type { HomePathChatIntent } from "@/server/rag/contextBuilder";
import { formatKRW, formatMonthly } from "@/lib/format";

export type HomePathInstructionScenario =
  | "current_home_explanation"
  | "candidate_explanation"
  | "purchase_power"
  | "same_budget_compare"
  | "risk_and_safety"
  | "data_source"
  | "missing_data";

export type HomePathInstructionContext = {
  text: string;
  scenarios: HomePathInstructionScenario[];
};

export function buildHomePathInstructionContext(input: {
  message: string;
  intent: HomePathChatIntent;
  profile?: UserProfile;
  currentHome?: CurrentHome;
  financialPlan?: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
}): HomePathInstructionContext {
  const scenarios = resolveInstructionScenarios(input);
  const blocks = [
    "필수 운영 지침",
    ...MANDATORY_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "현재 사용자 입력 요약",
    buildUserSituationSummary(input),
    "",
    "이번 답변에 적용할 상황별 지침",
    ...scenarios.flatMap((scenario) => scenarioInstructionLines[scenario])
  ];

  return {
    scenarios,
    text: blocks.join("\n")
  };
}

const MANDATORY_RULES = [
  "RAG 근거가 있더라도 답변의 최종 기준은 사용자 입력값, 계산 결과, 검색 context, 상황별 지침의 교집합이다.",
  "사용자가 입력한 집, 소득, 저축, 대출, 목표 예산은 추론으로 덮어쓰지 말고 계산 결과의 한계를 함께 말한다.",
  "매수하라, 팔아라, 지금 들어가라 같은 결론형 지시 대신 확인 조건과 선택지를 제시한다.",
  "수익률, 대출 승인, 세금, 법률 효과를 확정하지 않는다. 필요하면 금융기관, 세무사, 등기/권리관계 확인을 다음 행동으로 둔다.",
  "개인정보는 최소화한다. 주민등록번호, 정확한 동호수, 전화번호, 계좌번호 같은 민감정보를 요구하지 않는다.",
  "답변은 한 줄 결론, 근거 3개, 주의점, 다음 행동 순서로 쓰고 숫자는 원 단위보다 억/만원 단위로 쉽게 설명한다."
];

const scenarioInstructionLines: Record<HomePathInstructionScenario, string[]> = {
  current_home_explanation: [
    "- 현재 집 설명 상황: 사용자가 집을 넣고 설명을 요구하면 현재 추정가, 매입가, 대출잔액, 매각 후 순현금, 점유 형태를 먼저 풀어준다.",
    "- 현재 집을 팔아야 한다고 단정하지 말고 보유, 매도 후 갈아타기, 전세/월세 전환을 비교 가능한 선택지로 둔다.",
    "- 주소는 지역 단위로만 언급하고, 사용자가 입력하지 않은 세부 주소나 실거주 여부를 만들어내지 않는다."
  ],
  candidate_explanation: [
    "- 후보 설명 상황: 후보가 왜 떴는지 물으면 기준가, 거래 집중도, 전고점 대비 낙폭, 전세가율, 사용자 구매력과의 간격을 연결한다.",
    "- Transformer 신호는 확률적 참고 신호로 표현하고, 점수가 높다는 이유만으로 매수 적합하다고 말하지 않는다.",
    "- 후보 단지의 장점과 반드시 확인할 리스크를 같이 말한다."
  ],
  purchase_power: [
    "- 구매력 질문 상황: 현재 구매력, 현재 집 정리 후 예산, 5년 뒤 추정 구매력을 구분해서 설명한다.",
    "- 월소득과 월저축 대비 무리한 상환 부담 여부를 말하되 DSR/LTV 승인을 보장하지 않는다.",
    "- 예산이 부족하면 기간, 저축률, 목표 지역/면적 조정 같은 행동 단위 대안을 제시한다."
  ],
  same_budget_compare: [
    "- 같은 예산 비교 상황: 단일 승자를 선언하지 말고 안정성, 거래 회복, 전세가율, 가격 낙폭, 내 현금흐름 기준으로 비교한다.",
    "- 안전한 선택과 공격적인 선택을 분리해 설명하고, 사용자의 위험 선호가 낮으면 보수적 해석을 먼저 둔다.",
    "- 비교 대상 데이터가 부족하면 어떤 추가 후보나 지표가 필요할지 말한다."
  ],
  risk_and_safety: [
    "- 리스크/안전 질문 상황: 하락 리스크, 전세가율, 공급/공실, 금리와 대출 부담, 실거래 부재를 체크리스트로 제시한다.",
    "- '사도 돼?', '추천이야?' 같은 질문에는 의사결정 보조라는 점을 먼저 밝히고 매수 추천이 아니라고 답한다.",
    "- 위험 신호가 있으면 피하라고 단정하지 말고 확인해야 할 조건과 보수적으로 볼 이유를 설명한다."
  ],
  data_source: [
    "- 데이터 출처 질문 상황: 공공 실거래 데이터, 앱 계산식, Transformer artifact, RAG 문서/FAQ/안전 정책을 구분해서 말한다.",
    "- 출처별로 최신성, 누락 가능성, 실제 매물과의 차이를 주의점으로 붙인다."
  ],
  missing_data: [
    "- 데이터 부족 상황: 후보, 현재 집, 재정계획 중 빠진 항목이 있으면 샘플 기본값인지 사용자 입력값인지 구분해서 말한다.",
    "- 부족한 정보는 짧은 질문이나 다음 입력 항목으로 제안하고 임의로 단정하지 않는다."
  ]
};

function resolveInstructionScenarios(input: {
  message: string;
  intent: HomePathChatIntent;
  profile?: UserProfile;
  currentHome?: CurrentHome;
  financialPlan?: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
}) {
  const scenarios = new Set<HomePathInstructionScenario>();
  const text = input.message.toLowerCase();

  if (input.currentHome || /내\s*집|현재\s*집|집\s*넣|보유|매도|팔|갈아타/.test(text)) {
    scenarios.add("current_home_explanation");
  }
  if (input.activeCandidate || input.intent === "candidate_reason" || /후보|왜|떴|단지/.test(text)) {
    scenarios.add("candidate_explanation");
  }
  if (input.intent === "purchase_power" || /구매력|월급|소득|예산|가능|어디까지/.test(text)) {
    scenarios.add("purchase_power");
  }
  if (input.intent === "comparison" || /같은\s*예산|비교|어디가\s*더|안전/.test(text)) {
    scenarios.add("same_budget_compare");
  }
  if (input.intent === "risk_check" || input.intent === "safety" || /리스크|위험|사도|추천|수익|dsr|ltv|하락/.test(text)) {
    scenarios.add("risk_and_safety");
  }
  if (input.intent === "data_source" || /출처|데이터|근거|공공/.test(text)) {
    scenarios.add("data_source");
  }
  if (!input.activeCandidate && !input.currentHome) {
    scenarios.add("missing_data");
  }

  if (scenarios.size === 0) {
    scenarios.add("purchase_power");
    scenarios.add("risk_and_safety");
  }
  return Array.from(scenarios).slice(0, 4);
}

function buildUserSituationSummary(input: {
  profile?: UserProfile;
  currentHome?: CurrentHome;
  financialPlan?: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
}) {
  const lines: string[] = [];
  if (input.profile) {
    lines.push(
      `- 사용자 재정: 월소득 ${formatMonthly(input.profile.monthlyIncome)}, 월저축 ${formatMonthly(input.profile.monthlySavings)}, 현금 ${formatKRW(input.profile.cashOnHand)}, 위험성향 ${input.profile.riskPreference}.`
    );
  } else {
    lines.push("- 사용자 재정: 명시 입력이 부족하면 데모 기본값 사용 여부를 밝혀야 한다.");
  }

  if (input.currentHome) {
    lines.push(
      `- 현재 집: ${input.currentHome.region}, 추정가 ${formatKRW(input.currentHome.estimatedCurrentPrice)}, 매입가 ${formatKRW(input.currentHome.purchasePrice)}, 대출잔액 ${formatKRW(input.currentHome.loanBalance)}, 점유 ${input.currentHome.occupancyType}.`
    );
  } else {
    lines.push("- 현재 집: 입력된 현재 집 정보가 없으면 보유 주택 기준 판단을 단정하지 않는다.");
  }

  if (input.financialPlan) {
    lines.push(
      `- 목표: ${input.financialPlan.targetRegion} ${formatKRW(input.financialPlan.targetHomePrice)}, 목표 기간 ${input.financialPlan.targetHorizonYears}년, 편한 월상환 ${formatMonthly(input.financialPlan.maxComfortableMonthlyPayment)}.`
    );
  }

  if (input.activeCandidate) {
    lines.push(
      `- 현재 후보: ${input.activeCandidate.region} ${input.activeCandidate.complexName} ${input.activeCandidate.areaBucket}, 기준가 ${formatKRW(input.activeCandidate.referencePrice ?? 0)}, 거래 집중도 ${input.activeCandidate.transactionHeat.toFixed(2)}배.`
    );
  }
  return lines.join("\n");
}
