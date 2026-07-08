import { inferIntent, selectTemplate } from "./templates.js";

const categoryProfiles = {
  medical: {
    label: "의료",
    seeds: ["비용", "조건", "부작용", "병원", "보험", "후기", "처방", "검사"],
    conversionBias: 0.92,
    caution: "YMYL 검수와 전문가 리뷰가 필요합니다."
  },
  legal: {
    label: "법률",
    seeds: ["절차", "비용", "상담", "대응", "기간", "증거", "합의", "소송"],
    conversionBias: 0.88,
    caution: "개별 사안별 차이를 반드시 고지해야 합니다."
  },
  economy: {
    label: "일반 경제",
    seeds: ["전망", "뜻", "영향", "비교", "투자", "금리", "환율", "정책"],
    conversionBias: 0.54,
    caution: "투자 조언처럼 보이지 않게 근거와 한계를 분리해야 합니다."
  },
  "ax-trends": {
    label: "AX 최신 동향",
    seeds: ["사례", "도입", "전략", "업무자동화", "AI 에이전트", "비용", "실패", "조직"],
    conversionBias: 0.82,
    caution: "기능 나열보다 운영 구조와 의사결정 변화로 풀어야 합니다."
  },
  it: {
    label: "IT/SaaS",
    seeds: ["도입", "비교", "구축", "자동화", "보안", "권한", "연동", "ROI"],
    conversionBias: 0.8,
    caution: "의학/건강 문맥을 섞지 말고 업무 흐름, 데이터, 보안, 운영 지표 중심으로 풀어야 합니다."
  },
  "sports-baseball": {
    label: "스포츠 - 야구",
    seeds: ["순위", "전망", "일정", "선수", "한국야구", "분석", "기록", "부상"],
    conversionBias: 0.42,
    caution: "최신 일정과 기록은 live source 확인이 필요합니다."
  },
  "sports-basketball": {
    label: "스포츠 - 농구",
    seeds: ["순위", "전술", "선수", "일정", "NBA", "KBL", "부상", "분석"],
    conversionBias: 0.42,
    caution: "최신 경기 결과와 부상 정보는 live source 확인이 필요합니다."
  },
  fitness: {
    label: "운동/건강",
    seeds: ["자세", "효과", "루틴", "초보", "통증", "횟수", "기간", "다이어트"],
    conversionBias: 0.68,
    caution: "개인 몸 상태에 따른 차이를 안내해야 합니다."
  }
};

export function suggestKeywords(input = {}) {
  const category = input.category || "ax-trends";
  const profile = categoryProfiles[category] || categoryProfiles["ax-trends"];
  const seedKeyword = cleanKeyword(input.primaryKeyword || defaultTopicFor(category));
  const channel = input.channel || "owned-blog";
  const now = new Date().toISOString();

  const candidates = profile.seeds.map((modifier, index) => {
    const keyword = seedKeyword.includes(modifier)
      ? seedKeyword
      : `${seedKeyword} ${modifier}`;
    const intent = inferIntent(keyword, category);
    const volumeScore = clamp(82 - index * 4 + keyword.length % 7);
    const trendScore = clamp(64 + ((seedKeyword.charCodeAt(0) || 0) + index * 9) % 29);
    const conversionScore = clamp(Math.round((profile.conversionBias * 100) - index * 3));
    const difficultyScore = clamp(38 + index * 6 + (keyword.length % 9));
    const priorityScore = Math.round(
      volumeScore * 0.28 + trendScore * 0.22 + conversionScore * 0.32 - difficultyScore * 0.18
    );
    const template = selectTemplate({ keyword, category });

    return {
      keyword,
      category,
      channel,
      intent,
      templateId: template.id,
      templateName: template.name,
      volumeScore,
      trendScore,
      conversionScore,
      difficultyScore,
      priorityScore,
      volumeBand: band(volumeScore),
      rationale: buildRationale(keyword, intent, profile, priorityScore)
    };
  });

  candidates.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    generatedAt: now,
    mode: "dry-run-estimate",
    category,
    categoryLabel: profile.label,
    seedKeyword,
    channel,
    caveat: "현재 점수는 로컬 추정치입니다. Google Trends, Search Console, Naver DataLab, Keyword Planner 어댑터 연결 후 실제 점수로 대체됩니다.",
    requiredLiveSources: [
      "Google Search Console query/page data",
      "Google Trends",
      "Naver DataLab",
      "Keyword Planner or third-party SEO API"
    ],
    categoryCaution: profile.caution,
    candidates
  };
}

function cleanKeyword(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function defaultTopicFor(category) {
  if (category === "ax-trends") return "AX 도입";
  if (category === "it") return "AI 업무 자동화";
  if (category === "legal") return "계약서 검토";
  if (category === "economy") return "금리 전망";
  if (category === "sports-baseball") return "한국 야구 순위";
  if (category === "sports-basketball") return "KBL 순위";
  if (category === "fitness") return "스쿼트 자세";
  return "수면다원검사";
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function band(score) {
  if (score >= 78) return "high";
  if (score >= 58) return "medium";
  return "low";
}

function buildRationale(keyword, intent, profile, priorityScore) {
  const strength =
    priorityScore >= 65
      ? "우선 작성 후보입니다."
      : priorityScore >= 50
        ? "보조 클러스터로 적합합니다."
        : "성과 데이터가 쌓인 뒤 재평가하는 편이 좋습니다.";
  return `${keyword}은(는) ${profile.label} 카테고리에서 ${intent} 의도가 강합니다. ${strength}`;
}
