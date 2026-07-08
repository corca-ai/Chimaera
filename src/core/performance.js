export function simulatePerformanceLoop(metrics = {}) {
  const normalized = {
    impressions: numberOr(metrics.impressions, 0),
    clicks: numberOr(metrics.clicks, 0),
    avgPosition: numberOr(metrics.avgPosition, 0),
    sessions: numberOr(metrics.sessions, 0),
    ctaClicks: numberOr(metrics.ctaClicks, 0),
    leads: numberOr(metrics.leads, 0)
  };

  const ctr = ratio(normalized.clicks, normalized.impressions);
  const ctaRate = ratio(normalized.ctaClicks, normalized.sessions);
  const leadRate = ratio(normalized.leads, normalized.sessions);
  const leadFromCtaRate = ratio(normalized.leads, normalized.ctaClicks);

  const signals = [
    {
      id: "search-demand",
      label: "Search demand",
      value: normalized.impressions,
      verdict: normalized.impressions >= 1000 ? "strengthen" : "observe"
    },
    {
      id: "ctr",
      label: "CTR",
      value: `${(ctr * 100).toFixed(2)}%`,
      verdict: ctr >= 0.035 ? "strengthen-title" : "rewrite-title-meta"
    },
    {
      id: "rank",
      label: "Average position",
      value: normalized.avgPosition,
      verdict: normalized.avgPosition <= 10 ? "strengthen-internal-links" : "expand-depth"
    },
    {
      id: "cta-rate",
      label: "CTA click rate",
      value: `${(ctaRate * 100).toFixed(2)}%`,
      verdict: ctaRate >= 0.08 ? "keep-cta" : "move-or-rewrite-cta"
    },
    {
      id: "lead-rate",
      label: "Lead rate",
      value: `${(leadRate * 100).toFixed(2)}%`,
      verdict: leadRate >= 0.025 ? "strengthen-template" : "weaken-template"
    },
    {
      id: "form-friction",
      label: "CTA to lead rate",
      value: `${(leadFromCtaRate * 100).toFixed(2)}%`,
      verdict: leadFromCtaRate >= 0.25 ? "keep-form" : "reduce-form-friction"
    }
  ];

  const actions = Array.from(
    new Set(
      signals.map((signal) => signal.verdict).filter((verdict) => verdict !== "observe")
    )
  );

  return {
    metrics: normalized,
    derived: {
      ctr,
      ctaRate,
      leadRate,
      leadFromCtaRate
    },
    signals,
    actions,
    summary: summarize(actions)
  };
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function summarize(actions) {
  if (actions.includes("strengthen-template") && actions.includes("strengthen-title")) {
    return "검색 수요와 클릭 반응, 리드 전환이 모두 좋아서 같은 템플릿과 키워드 클러스터를 강화합니다.";
  }
  if (actions.includes("rewrite-title-meta")) {
    return "노출 대비 클릭이 약합니다. 제목, 메타 설명, 첫 문단의 검색 의도 매칭을 먼저 고칩니다.";
  }
  if (actions.includes("weaken-template")) {
    return "방문은 있지만 리드 전환이 약합니다. CTA 위치, 문제-브랜드 연결, 폼 마찰을 조정합니다.";
  }
  return "데이터가 아직 뚜렷하지 않습니다. 추가 노출과 전환 데이터를 더 모읍니다.";
}
