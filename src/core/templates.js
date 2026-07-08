export const articleTemplates = [
  {
    id: "ax-trend-explainer",
    name: "AX/IT 트렌드 해설형",
    bestFor: ["ax-trends", "it", "saas", "b2b", "ai"],
    intents: ["trend", "what-is", "adoption", "strategy", "case"],
    structure: [
      "목차 승인용 빠른 결론",
      "왜 지금 이 키워드가 중요해졌는가",
      "현업에서 실제로 바뀌는 업무 흐름",
      "도입 전에 확인해야 할 전제 조건",
      "실패하는 팀들이 반복하는 패턴",
      "작게 시작하는 도입 로드맵",
      "솔루션/파트너 선택 기준",
      "우리 브랜드가 해결하는 운영 구조",
      "자료 요청/상담 CTA"
    ],
    schema: ["Article", "FAQPage", "BreadcrumbList", "Organization"]
  },
  {
    id: "b2b-solution-guide",
    name: "B2B 솔루션 선택 가이드형",
    bestFor: ["ax-trends", "it", "saas", "b2b", "enterprise"],
    intents: ["compare", "choice", "implementation", "cost", "roi"],
    structure: [
      "빠른 결론: 어떤 팀에게 맞는 선택인가",
      "도입 목적을 먼저 나누는 이유",
      "필수 기능과 있으면 좋은 기능 구분",
      "데이터/보안/권한 구조 체크",
      "비용보다 먼저 봐야 할 운영 부담",
      "구축형과 구독형 비교",
      "도입 후 성과를 측정하는 지표",
      "우리 제품/서비스 연결",
      "데모/문의 CTA"
    ],
    schema: ["Article", "FAQPage", "BreadcrumbList", "Organization"]
  },
  {
    id: "eligibility-conditions",
    name: "가능 여부/조건 판정형",
    bestFor: ["medical", "legal", "service", "finance"],
    intents: ["can-i", "eligibility", "condition", "cost"],
    structure: [
      "빠른 결론: 이 조건이면 가능하고, 이 경우는 진단이 필요합니다.",
      "개념 정의",
      "가능한 케이스",
      "어려운 케이스",
      "비교표 또는 체크리스트",
      "진행 과정",
      "비용/기간/리스크",
      "자주 묻는 질문",
      "상담/문의 CTA"
    ],
    schema: ["Article", "FAQPage", "BreadcrumbList", "Person", "Organization"]
  },
  {
    id: "how-to-routine",
    name: "방법/루틴 튜토리얼형",
    bestFor: ["fitness", "sports", "product-usage"],
    intents: ["how-to", "routine", "beginner", "duration"],
    structure: [
      "독자가 겪는 실패 상황",
      "정확한 방법 요약",
      "단계별 동작/절차",
      "초보자가 많이 하는 실수",
      "횟수/기간/빈도",
      "효과를 높이는 보조 전략",
      "자주 묻는 질문",
      "브랜드/제품 CTA"
    ],
    schema: ["Article", "FAQPage", "BreadcrumbList", "HowTo"]
  },
  {
    id: "risk-avoidance",
    name: "위험 회피/체크리스트형",
    bestFor: ["medical", "legal", "finance", "b2b"],
    intents: ["avoid", "risk", "scam", "checklist", "trust"],
    structure: [
      "문제가 아직 끝나지 않았다는 현실 인식",
      "피해자가 빠지는 공통 함정",
      "위험 신호",
      "안전한 선택 기준",
      "좋은 곳과 위험한 곳 비교표",
      "브랜드가 해결하는 구조",
      "조심스럽고 신뢰감 있는 CTA"
    ],
    schema: ["Article", "BreadcrumbList", "Person", "Organization"]
  },
  {
    id: "test-procedure",
    name: "검사/시술 과정 설명형",
    bestFor: ["medical", "healthcare", "clinic"],
    intents: ["what-is", "procedure", "preparation", "insurance"],
    structure: [
      "증상에서 시작하는 공감",
      "검사/시술 정의",
      "누가 받아야 하는가",
      "과정과 소요 시간",
      "준비물과 주의사항",
      "결과 해석",
      "보험/비용/서류",
      "전문가 한마디",
      "예약 CTA"
    ],
    schema: ["BlogPosting", "FAQPage", "BreadcrumbList", "MedicalWebPage"]
  },
  {
    id: "effect-side-effect",
    name: "효과/부작용/처방형",
    bestFor: ["medical", "wellness", "product"],
    intents: ["effect", "side-effect", "prescription", "safety"],
    structure: [
      "왜 관심이 커졌는가",
      "작용 원리",
      "대상과 비대상",
      "기대 효과",
      "부작용과 금기",
      "병원/제품 선택 기준",
      "전문가 검토",
      "상담 CTA"
    ],
    schema: ["BlogPosting", "FAQPage", "BreadcrumbList", "Person"]
  },
  {
    id: "case-before-after",
    name: "사례/비포애프터형",
    bestFor: ["clinic", "beauty", "fitness", "portfolio"],
    intents: ["before-after", "case", "example", "celebrity"],
    structure: [
      "관심을 끄는 사례 훅",
      "사례별 이미지와 관찰 포인트",
      "전문가 해석",
      "유형별 공통점",
      "주의할 점",
      "내 상황에 적용하는 법",
      "FAQ",
      "진단/상담 CTA"
    ],
    schema: ["Article", "ImageObject", "FAQPage", "BreadcrumbList", "Person"]
  },
  {
    id: "comparison-choice",
    name: "비교/선택형",
    bestFor: ["medical", "legal", "saas", "finance", "consumer"],
    intents: ["compare", "versus", "choice", "price"],
    structure: [
      "빠른 결론",
      "비교 기준",
      "A와 B의 차이",
      "누구에게 무엇이 맞는가",
      "비용/기간/리스크 비교",
      "선택 전 확인할 것",
      "브랜드/제품 연결",
      "CTA"
    ],
    schema: ["Article", "FAQPage", "BreadcrumbList"]
  }
];

const intentHints = [
  ["trend", ["트렌드", "최신", "동향", "전망"]],
  ["adoption", ["도입", "구축", "전환", "ax", "ai 에이전트", "업무자동화"]],
  ["strategy", ["전략", "로드맵", "운영", "조직", "프로세스"]],
  ["how-to", ["방법", "하는 법", "자세", "루틴", "사용법", "운동"]],
  ["eligibility", ["가능", "조건", "대상", "처방", "보험", "비용"]],
  ["risk", ["피하는", "주의", "위험", "먹튀", "사기", "부작용"]],
  ["effect", ["효과", "부작용", "개선", "다이어트"]],
  ["before-after", ["전후", "사례", "비교 top", "후기"]],
  ["compare", ["vs", "차이", "비교", "선택"]]
];

export function inferIntent(keyword = "", category = "") {
  const normalized = `${keyword} ${category}`.toLowerCase();
  for (const [intent, hints] of intentHints) {
    if (hints.some((hint) => normalized.includes(hint))) return intent;
  }
  if (normalized.includes("의료") || normalized.includes("clinic")) {
    return "eligibility";
  }
  return "what-is";
}

export function selectTemplate({ keyword = "", category = "", forcedTemplateId }) {
  if (forcedTemplateId) {
    const forced = articleTemplates.find((template) => template.id === forcedTemplateId);
    if (forced) return forced;
  }

  const intent = inferIntent(keyword, category);
  const categoryNormalized = category.toLowerCase();
  const scored = articleTemplates
    .map((template) => {
      let score = 0;
      if (template.intents.includes(intent)) score += 4;
      if (template.bestFor.some((item) => categoryNormalized.includes(item))) score += 2;
      if (
        ["ax-trends", "it", "saas", "ai", "b2b"].some((item) => categoryNormalized.includes(item)) &&
        template.bestFor.some((item) => ["ax-trends", "it", "saas", "b2b", "ai"].includes(item))
      ) {
        score += 3;
      }
      if (categoryNormalized.includes("medical") && template.bestFor.includes("medical")) {
        score += 1;
      }
      return { template, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.template ?? articleTemplates[0];
}
