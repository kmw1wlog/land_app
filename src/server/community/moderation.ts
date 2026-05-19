const BANNED_WORDS = ["확정수익", "무조건오른다", "수익보장", "급등보장", "매수추천"];
const AD_PATTERNS = [/010[-\s]?\d{4}[-\s]?\d{4}/, /카톡|오픈채팅|텔레그램|무료상담/g];

export function moderateCommunityText(title: string, content: string) {
  const compact = `${title} ${content}`.replace(/\s/g, "");
  const banned = BANNED_WORDS.filter((word) => compact.includes(word));
  const adLike = AD_PATTERNS.some((pattern) => pattern.test(`${title} ${content}`));
  return {
    status: banned.length || adLike ? "needs_review" : "visible",
    isHidden: banned.length > 0,
    verificationLabel: verificationLabelForContent(content),
    reasons: [...banned, ...(adLike ? ["반복 광고/연락처 의심"] : [])]
  };
}

export function shouldBlindPost(reportCount: number) {
  return reportCount >= Number(process.env.COMMUNITY_BLIND_REPORT_THRESHOLD ?? 3);
}

function verificationLabelForContent(content: string) {
  if (/호재|악재|개발|입주|재건축|신고가|급매/.test(content)) {
    return "검증 필요";
  }
  return "일반 의견";
}
