import type { ExpandedRegion } from "./regionExpansionService";

export const REGION_SIMILARITY_SEED: Record<string, ExpandedRegion[]> = {
  "27260": [
    { label: "대구 수성구", lawdCode5: "27260", reason: "exact", weight: 1 },
    { label: "대구 중구", lawdCode5: "27110", reason: "neighbor", weight: 0.72 },
    { label: "대구 동구", lawdCode5: "27140", reason: "same_lifestyle", weight: 0.65 },
    { label: "대구 남구", lawdCode5: "27200", reason: "neighbor", weight: 0.62 },
    { label: "대구 달서구", lawdCode5: "27290", reason: "price_comparable", weight: 0.55 }
  ],
  "11200": [
    { label: "서울 성동구", lawdCode5: "11200", reason: "exact", weight: 1 },
    { label: "서울 광진구", lawdCode5: "11215", reason: "neighbor", weight: 0.72 },
    { label: "서울 중구", lawdCode5: "11140", reason: "neighbor", weight: 0.65 },
    { label: "서울 동대문구", lawdCode5: "11230", reason: "price_comparable", weight: 0.58 },
    { label: "서울 마포구", lawdCode5: "11440", reason: "explore", weight: 0.45 }
  ],
  "11440": [
    { label: "서울 마포구", lawdCode5: "11440", reason: "exact", weight: 1 },
    { label: "서울 서대문구", lawdCode5: "11410", reason: "neighbor", weight: 0.68 },
    { label: "서울 용산구", lawdCode5: "11170", reason: "price_comparable", weight: 0.55 },
    { label: "서울 성동구", lawdCode5: "11200", reason: "explore", weight: 0.44 }
  ]
};

export const REGION_LABEL_TO_LAWD: Record<string, string> = {
  "대구 수성구": "27260",
  "서울 성동구": "11200",
  "서울 마포구": "11440",
  "서울 노원구": "11350",
  "경기 성남시 분당구": "41135",
  "경기 수원시 영통구": "41117"
};
