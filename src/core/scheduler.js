const defaultSlots = {
  "owned-blog": [9, 13, 18],
  "naver-support": [11, 17, 21]
};

export function proposeSchedule(input = {}) {
  const count = numberOr(input.count, 4);
  const channel = input.channel || "owned-blog";
  const category = input.category || "ax-trends";
  const primaryKeyword = input.primaryKeyword || "AI 에이전트 도입 전략";
  const brandName = input.brandName || "The Moonlight";
  const productName = input.productName || "AX 컨설팅 및 AI 에이전트 구축";
  const leadGoal = input.leadGoal || "도입 상담 신청";
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00+09:00`) : nextMorning();
  const slots = defaultSlots[channel] || defaultSlots["owned-blog"];
  const cadenceDays = numberOr(input.cadenceDays, channel === "owned-blog" ? 2 : 3);

  const jobs = Array.from({ length: count }, (_, index) => {
    const publishAt = new Date(start);
    publishAt.setDate(start.getDate() + index * cadenceDays);
    publishAt.setHours(slots[index % slots.length], 0, 0, 0);
    const contentId = buildScheduleId(channel, category, primaryKeyword, index, publishAt);
    return {
      id: contentId,
      channel,
      category,
      primaryKeyword: index === 0 ? primaryKeyword : `${primaryKeyword} ${index + 1}`,
      brandName,
      productName,
      leadGoal,
      publishAt: publishAt.toISOString(),
      localTime: formatKst(publishAt),
      status: "scheduled-draft",
      reason: scheduleReason(channel, index),
      requiredBeforePublish: [
        "quality score >= 85",
        "JSON-LD valid",
        "image ALT and filename present",
        "GTM content_id event present",
        "manual review for YMYL when applicable"
      ]
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "local-schedule-proposal",
    channel,
    category,
    count,
    cadenceDays,
    jobs
  };
}

function nextMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildScheduleId(channel, category, keyword, index, date) {
  const seed = `${channel}|${category}|${keyword}|${index}|${date.toISOString()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  return `schedule_${hash.toString(16).padStart(8, "0")}`;
}

function formatKst(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function scheduleReason(channel, index) {
  if (channel === "naver-support") {
    return index === 0
      ? "네이버 보조 유입 글은 자사 원본과 각도, 도입, CTA를 다르게 잡아야 합니다."
      : "동일 주제 복붙을 피하고 다른 검색 의도에서 접근합니다.";
  }
  return index === 0
    ? "자사 블로그 원본 글은 성과 측정의 기준 콘텐츠입니다."
    : "동일 클러스터 후속 글로 내부 링크와 주제 권위를 쌓습니다.";
}
