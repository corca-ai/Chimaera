export function buildNaverDerivative(run) {
  const keyword = run.input.primaryKeyword;
  const ownedTitle = run.architecture.h1;
  const topCandidates = run.keywordResearch.candidates.slice(0, 3);
  const angle = chooseNaverAngle(run);

  return {
    role: "support-channel-only",
    duplicateContentPolicy:
      "자사 블로그 원문을 복사하지 않습니다. 제목, 도입, 섹션 순서, 예시, CTA를 모두 다시 설계합니다.",
    ownedSourceTitle: ownedTitle,
    suggestedTitle: angle.title,
    suggestedIntro:
      `${keyword}을 검색하다 보면 정보는 많지만, 내 상황에 맞는 기준을 잡기는 쉽지 않습니다. ` +
      `이 글에서는 전문 용어를 줄이고, 검색 전에 먼저 확인하면 좋은 판단 기준을 네이버 독자용으로 풀어봅니다.`,
    sectionPlan: [
      "검색자가 처음 헷갈리는 지점",
      "내 상황에 적용할 때 봐야 할 기준",
      "자사 블로그 원문과 다른 쉬운 예시",
      "주의할 점과 오해하기 쉬운 부분",
      "더 자세한 판단이 필요한 경우"
    ],
    ctaPolicy:
      "직접 리드 전환을 강하게 요구하지 않고, 자사 블로그 원문 또는 상담 페이지로 자연스럽게 연결합니다.",
    linkStrategy: [
      {
        label: "자세한 기준 보기",
        target: run.publishing.ownedBlog.canonicalPath,
        reason: "네이버 글은 보조 유입 채널이며 정밀 계측은 자사 블로그에서 수행합니다."
      }
    ],
    keywordVariants: topCandidates.map((candidate) => candidate.keyword),
    mustAvoid: [
      "자사 블로그 문장 복붙",
      "동일 H2 순서",
      "동일 이미지 ALT",
      "동일 CTA 문구",
      "과도한 병원/제품 광고 문장"
    ]
  };
}

function chooseNaverAngle(run) {
  const keyword = run.input.primaryKeyword;
  if (run.input.category === "ax-trends") {
    return {
      title: `요즘 ${keyword}, 회사들은 왜 다르게 접근할까요?`
    };
  }
  if (run.input.category === "fitness") {
    return {
      title: `${keyword} 검색 전, 초보자가 먼저 알아야 할 기준`
    };
  }
  if (run.input.category.includes("sports")) {
    return {
      title: `${keyword}을 볼 때 놓치기 쉬운 관전 포인트`
    };
  }
  return {
    title: `${keyword}, 검색 전에 먼저 확인하면 좋은 기준`
  };
}
