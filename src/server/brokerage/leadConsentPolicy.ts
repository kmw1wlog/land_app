export interface LeadConsentInput {
  userBudget?: number;
  userCash?: number;
  userMonthlyIncome?: number;
  budgetBand?: string;
  contactInfo?: string;
  currentHomeSummary?: Record<string, unknown>;
  consents?: {
    financialInfo?: boolean;
    currentHomeInfo?: boolean;
    contactInfo?: boolean;
  };
}

export function sanitizeLeadPayloadByConsent(input: LeadConsentInput) {
  const consents = {
    financialInfo: Boolean(input.consents?.financialInfo),
    currentHomeInfo: Boolean(input.consents?.currentHomeInfo),
    contactInfo: Boolean(input.consents?.contactInfo)
  };
  return {
    consents,
    budgetBand: input.budgetBand,
    userBudget: consents.financialInfo && input.userBudget ? BigInt(Number(input.userBudget)) : null,
    userCash: consents.financialInfo && input.userCash ? BigInt(Number(input.userCash)) : null,
    userMonthlyIncome: consents.financialInfo && input.userMonthlyIncome ? BigInt(Number(input.userMonthlyIncome)) : null,
    currentHomeSummary: consents.currentHomeInfo ? input.currentHomeSummary ?? {} : {},
    contactInfo: consents.contactInfo ? input.contactInfo ?? null : null
  };
}
