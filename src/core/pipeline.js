import { agentNodes, agentEdges, dataTables } from "./agents.js";
import { articleTemplates, inferIntent, selectTemplate } from "./templates.js";
import { benchmarkInsights } from "../data/benchmark-insights.js";
import { buildSeoGateReport } from "../data/search-central-rules.js";
import { integrationAdapters } from "../integrations/adapters.js";
import { evaluateQuality } from "./quality.js";
import { simulatePerformanceLoop } from "./performance.js";
import { suggestKeywords } from "./keyword-research.js";
import { proposeSchedule } from "./scheduler.js";
import { validateStructuredData } from "./schema-validator.js";
import { humanizeDraft } from "./humanization.js";

const DEFAULT_INPUT = {
  channel: "owned-blog",
  category: "ax-trends",
  primaryKeyword: "AI 에이전트 도입 전략",
  brandName: "The Moonlight",
  productName: "AX 컨설팅 및 AI 에이전트 구축",
  audience: "검색으로 문제 해결 방법을 찾는 잠재 고객",
  writingInstruction: "",
  referenceUrls: [],
  leadGoal: "도입 상담 신청",
  location: "서울",
  tone: "AI 느낌 없이, 사람이 직접 설명하는 자연스러운 한국어",
  anthropicModel: "claude-opus-4-8",
  anthropicEffort: "high"
};

export function normalizeInput(input = {}) {
  const merged = { ...DEFAULT_INPUT };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      merged[key] = value;
    }
  }

  return {
    ...merged,
    channel: String(merged.channel).trim(),
    category: String(merged.category).trim(),
    primaryKeyword: String(merged.primaryKeyword).trim(),
    brandName: String(merged.brandName).trim(),
    productName: String(merged.productName).trim(),
    audience: String(merged.audience || DEFAULT_INPUT.audience).trim(),
    writingInstruction: String(merged.writingInstruction || "").trim(),
    referenceUrls: normalizeUrlList(merged.referenceUrls || merged.benchmarkUrls || []),
    leadGoal: String(merged.leadGoal).trim(),
    anthropicModel: String(merged.anthropicModel || "claude-opus-4-8").trim(),
    anthropicEffort: String(merged.anthropicEffort || "high").trim(),
    outlineRevisionInstruction: String(merged.outlineRevisionInstruction || "").trim(),
    previousOutline: merged.previousOutline || null
  };
}

function normalizeUrlList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/\s+/);
  return source
    .map((url) => String(url).trim())
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index)
    .slice(0, 12);
}

export function createContentId(input) {
  const seed = [
    input.channel,
    input.category,
    input.primaryKeyword,
    new Date().toISOString().slice(0, 10)
  ].join("|");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `content_${hash.toString(16).padStart(8, "0")}`;
}

function filenameToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function topicPhrase(value) {
  return String(value).trim();
}

function buildKeywordBrief(input) {
  const keyword = input.primaryKeyword;
  const intent = inferIntent(keyword, input.category);
  const modifiers = keywordModifiersFor(input.category);
  const keywordCluster = modifiers
    .filter((modifier) => !keyword.includes(modifier))
    .slice(0, 5)
    .map((modifier, index) => ({
      keyword: `${keyword} ${modifier}`,
      role: index < 2 ? "secondary" : "long-tail",
      intent,
      volumeBand: "needs-live-source",
      trendScore: "needs-live-source"
    }));

  return {
    primaryKeyword: keyword,
    inferredIntent: intent,
    searchReason:
      isTechCategory(input.category)
        ? "검색자는 개념 설명보다 실제 도입 판단, 조직 적용 방식, 실패 리스크, 다음 행동을 알고 싶어합니다."
        : "검색자는 빠른 결론, 자기 상황에 해당되는지, 비용/위험/다음 행동을 알고 싶어합니다.",
    liveResearchAdapters: [
      "Google Search Console query data",
      "Google Trends",
      "Naver DataLab",
      "Keyword planner or third-party SEO API"
    ],
    keywordCluster
  };
}

function keywordModifiersFor(category) {
  if (isTechCategory(category)) {
    return ["사례", "도입", "전략", "비용", "실패", "조직", "로드맵", "솔루션"];
  }
  return ["비용", "조건", "후기", "부작용", "방법", "비교", "추천", "기간"];
}

function buildArchitecture(input, template, keywordBrief) {
  const h1 = createH1(input.primaryKeyword, template.id);
  const sections = template.structure.map((section, index) => ({
    id: `section_${String(index + 1).padStart(2, "0")}`,
    h2: makeHeading(section, input.primaryKeyword, template.id, index),
    job: section,
    userQuestion: makeUserQuestion(section, input.primaryKeyword),
    requiredEvidence: evidenceFor(section, input.category),
    imageNeed: imageNeedFor(section, input.category)
  }));

  return {
    h1,
    metaTitle: `${h1} | ${input.brandName}`,
    metaDescription: `${topicPhrase(
      input.primaryKeyword
    )} 관련 조건, 판단 기준, 주의점, 다음 행동까지 ${input.brandName} 관점에서 정리했습니다.`,
    slug: filenameToken(input.primaryKeyword),
    conclusionFirst:
      "초반 3문단 안에서 독자가 가장 궁금해하는 답을 먼저 제시하고, 이후 섹션에서 판단 근거를 풀어냅니다.",
    sections,
    tableOfContents: sections.map((section, index) => ({
      order: index + 1,
      id: section.id,
      h2: section.h2,
      userQuestion: section.userQuestion,
      imageNeed: section.imageNeed,
      imagePlacement: section.imageNeed === "none" ? "none" : `after ${section.id}`
    })),
    htmlStructure: buildHtmlStructure(sections),
    schemaTargets: template.schema,
    internalLinkPlan: [
      "상위 카테고리 허브 글",
      "관련 비교/비용 글",
      "전환용 상담 또는 자료 요청 페이지"
    ]
  };
}

function createH1(keyword, templateId) {
  if (templateId === "ax-trend-explainer") {
    return `${keyword}, 실제 도입 전에 먼저 봐야 할 운영 구조`;
  }
  if (templateId === "b2b-solution-guide") {
    return `${keyword}, 솔루션보다 먼저 정해야 할 기준`;
  }
  if (templateId === "how-to-routine") {
    return `${keyword}, 처음 하는 분도 따라할 수 있는 정확한 방법`;
  }
  if (templateId === "risk-avoidance") {
    return `${keyword}, 피하려면 처음에 무엇을 봐야 할까요?`;
  }
  if (templateId === "effect-side-effect") {
    return `${keyword} 전 꼭 확인할 효과와 주의점`;
  }
  if (templateId === "comparison-choice") {
    return `${keyword}, 어떤 선택이 내게 맞을까요?`;
  }
  return `${keyword}, 내 상황에도 해당될까요?`;
}

function makeHeading(section, keyword, templateId, index) {
  if (index === 0) {
    if (templateId === "ax-trend-explainer") return `${keyword}, 결론부터 말하면 도구보다 운영 방식의 문제입니다`;
    if (templateId === "b2b-solution-guide") return `${keyword}, 먼저 목적부터 나눠야 합니다`;
    if (templateId === "risk-avoidance") return `${keyword}, 아직 안심하기 어려운 이유`;
    if (templateId === "how-to-routine") return `${keyword}의 핵심은 속도가 아니라 자세입니다`;
    return `${keyword}부터 빠르게 정리해보겠습니다`;
  }
  return section
    .replace("빠른 결론: ", "")
    .replace("CTA", "상담 신청")
    .replace("FAQ", "자주 묻는 질문");
}

function makeUserQuestion(section, keyword) {
  if (section.includes("업무") || section.includes("운영")) return `${keyword}이 실제 업무 흐름을 어떻게 바꿀까?`;
  if (section.includes("도입") || section.includes("로드맵")) return `${keyword}을 어디서부터 작게 시작해야 할까?`;
  if (section.includes("실패")) return `${keyword} 도입이 실패하는 이유는 무엇일까?`;
  if (section.includes("솔루션") || section.includes("파트너")) return `어떤 기준으로 ${keyword} 파트너를 골라야 할까?`;
  if (section.includes("비용")) return `${keyword}은(는) 비용이 어느 정도이고, 추가로 확인할 부분은 무엇일까?`;
  if (section.includes("가능") || section.includes("대상")) return `내 상황도 ${keyword}에 해당될까?`;
  if (section.includes("부작용") || section.includes("리스크")) return `시작 전에 조심해야 할 문제는 무엇일까?`;
  if (section.includes("CTA") || section.includes("상담")) return `이제 무엇을 하면 될까?`;
  return `이 섹션에서 독자가 바로 알고 싶은 답은 무엇일까?`;
}

function evidenceFor(section, category) {
  const lower = category.toLowerCase();
  if (isTechCategory(category)) {
    if (section.includes("실패")) return "도입 실패 패턴, 운영 병목, 현업 사용률 지표";
    if (section.includes("비용")) return "구축 범위, 유지보수 비용, 자동화 대상 업무량";
    if (section.includes("보안") || section.includes("권한")) return "데이터 접근 권한, 로그, 보안 정책, 승인 흐름";
    if (section.includes("성과") || section.includes("지표")) return "리드타임, 처리량, 반복 업무 절감률, 전환율";
    return "실제 도입 사례, 업무 흐름 변화, 조직 운영 기준";
  }
  if (lower.includes("medical") || lower.includes("의료")) {
    return section.includes("비용") || section.includes("보험")
      ? "공식 수가, 보험 기준, 병원별 변동 가능성"
      : "전문의 검토, 공신력 있는 자료, 개인차/한계 고지";
  }
  if (lower.includes("legal") || lower.includes("법률")) {
    return "법령/판례/제도 기준과 개인 사안별 차이 고지";
  }
  if (section.includes("비교")) return "비교 기준과 선택 기준";
  return "경험적 설명, 체크리스트, 관련 내부 링크";
}

function imageNeedFor(section, category = "") {
  if (isTechCategory(category)) {
    if (section.includes("업무") || section.includes("운영")) return "workflow diagram";
    if (section.includes("로드맵") || section.includes("단계")) return "implementation roadmap visual";
    if (section.includes("실패") || section.includes("리스크")) return "risk checklist infographic";
    if (section.includes("비교") || section.includes("선택")) return "solution comparison table";
    if (section.includes("브랜드") || section.includes("제품") || section.includes("CTA")) return "product architecture visual";
    return "none";
  }
  if (section.includes("과정") || section.includes("단계")) return "step-by-step visual";
  if (section.includes("비교")) return "comparison table or infographic";
  if (section.includes("부작용") || section.includes("리스크")) return "caution infographic";
  if (section.includes("CTA") || section.includes("상담")) return "brand trust visual";
  return "contextual explanatory image";
}

function buildDraft(input, architecture) {
  const sections = architecture.sections.map((section, index) => {
    const paragraphs = sectionCopy(input, section, index);
    return {
      ...section,
      markdown: `## ${section.h2}\n\n${paragraphs.join("\n\n")}`
    };
  });

  return {
    engine: "local-deterministic-fallback",
    note: "Replace this writer with Claude API adapter when credentials are connected.",
    markdown: [`# ${architecture.h1}`, "", ...sections.map((section) => section.markdown)].join(
      "\n\n"
    ),
    sections
  };
}

function sectionCopy(input, section, index) {
  const keyword = input.primaryKeyword;
  const brand = input.brandName;
  const product = input.productName;
  const job = section.job;

  if (isTechCategory(input.category)) {
    return techSectionCopy({ keyword, brand, product, job, section, index });
  }

  if (index === 0) {
    return [
      `${keyword}을 검색한 분들이 가장 먼저 알고 싶은 답은 대개 비슷합니다. 지금 내 상황에서 시작해도 되는지, 비용이나 위험은 어느 정도인지, 그리고 어디까지 확인한 뒤 결정해야 하는지입니다.`,
      `빠른 답부터 드리면, 이 주제는 한 문장으로 단정하기 어렵습니다. 조건이 맞는 경우에는 좋은 선택지가 될 수 있지만, 개인 상태와 목적에 따라 확인해야 할 지점이 달라집니다.`,
      `그래서 이 글은 광고처럼 밀어붙이지 않고, 먼저 판단 기준을 세우는 방식으로 정리합니다. 읽고 나면 상담 전에 무엇을 물어봐야 할지 훨씬 또렷해지는 것을 목표로 합니다.`
    ];
  }

  if (job.includes("정의") || job.includes("개념")) {
    return [
      `${keyword}을 이해할 때는 이름보다 적용 범위를 먼저 봐야 합니다. 같은 표현을 쓰더라도 실제로 어떤 상황에 쓰이는지, 어떤 조건에서 의미가 달라지는지가 더 중요합니다.`,
      `이 단계에서는 공식 설명, 전문가 검토, 실제 적용 기준을 함께 확인해야 합니다. 검색 결과에 보이는 짧은 후기만으로 결정하면 빠뜨리는 부분이 생기기 쉽습니다.`
    ];
  }

  if (job.includes("가능") || job.includes("대상") || job.includes("받아야")) {
    return [
      `해당 여부는 단순히 관심이 있다는 이유만으로 정해지지 않습니다. 현재 상태, 기대하는 결과, 기존 병력이나 생활 조건까지 함께 봐야 합니다.`,
      `이런 주제일수록 "되는지 안 되는지"보다 "왜 되는지, 왜 조심해야 하는지"를 확인하는 편이 좋습니다. 그래야 상담을 받아도 설명을 흘려듣지 않고 내 기준으로 판단할 수 있습니다.`
    ];
  }

  if (job.includes("어려운") || job.includes("주의") || job.includes("부작용") || job.includes("리스크")) {
    return [
      `주의할 점을 먼저 확인하는 태도는 소극적인 태도가 아닙니다. 오히려 좋은 선택을 오래 유지하기 위한 기본에 가깝습니다.`,
      `특히 건강, 비용, 법률처럼 삶에 직접 영향을 주는 주제라면 장점만 보는 글은 충분하지 않습니다. 제한 사항, 개인차, 중단해야 하는 신호까지 함께 봐야 합니다.`
    ];
  }

  if (job.includes("비교") || job.includes("체크리스트")) {
    return [
      `비교할 때는 가격이나 후기 하나만 보지 않는 편이 좋습니다. 기준을 나누면 판단이 훨씬 쉬워집니다.`,
      `우선 내 상황과 맞는지, 설명이 충분한지, 사후 관리가 가능한지, 그리고 예상 밖의 비용이나 위험을 미리 알려주는지 확인해야 합니다.`
    ];
  }

  if (job.includes("과정") || job.includes("단계")) {
    return [
      `과정은 결과만큼 중요합니다. 처음 상담에서 무엇을 확인하고, 중간에 어떤 기준으로 경과를 보는지 알아야 불안이 줄어듭니다.`,
      `좋은 과정은 복잡한 말을 많이 하는 것이 아니라, 지금 단계에서 필요한 선택지를 차분히 좁혀주는 방식입니다. 이 흐름이 분명할수록 이후 결정도 덜 흔들립니다.`
    ];
  }

  if (job.includes("비용") || job.includes("보험") || job.includes("서류")) {
    return [
      `비용은 검색자가 가장 예민하게 보는 지점입니다. 다만 같은 키워드라도 포함 항목, 횟수, 사후 관리, 개인 조건에 따라 실제 부담은 달라질 수 있습니다.`,
      `그래서 금액만 묻기보다 무엇이 포함되는지, 추가 비용 가능성은 있는지, 보험이나 서류가 필요한지까지 함께 확인하는 편이 안전합니다.`
    ];
  }

  if (job.includes("FAQ") || job.includes("자주")) {
    return [
      `아래 질문들은 검색자가 마지막까지 가장 많이 확인하는 내용입니다. 짧게 답하되, 단정이 필요한 부분과 상담이 필요한 부분을 나눠서 보겠습니다.`,
      `답이 애매하게 느껴지는 항목은 그 자체가 상담 때 물어봐야 할 질문입니다. 기록해두면 실제 상담 시간이 훨씬 알차집니다.`
    ];
  }

  if (job.includes("전문가")) {
    return [
      `전문가의 역할은 선택을 대신해주는 것이 아니라, 판단에 필요한 정보를 정확히 정리해주는 데 있습니다.`,
      `${brand}는 ${keyword}처럼 독자가 혼자 판단하기 어려운 주제를 다룰 때, 장점과 한계를 함께 설명하는 방식을 우선합니다.`
    ];
  }

  if (job.includes("CTA") || job.includes("상담") || job.includes("예약")) {
    return [
      `여기까지 읽고도 내 상황에 바로 적용하기 어렵다면, 혼자 더 검색하기보다 현재 상태를 기준으로 확인해보는 편이 빠릅니다.`,
      `${brand}의 ${product}은 검색으로는 놓치기 쉬운 조건과 다음 단계를 함께 정리합니다. 상담 신청을 남겨주시면, 지금 상황에서 무엇부터 확인해야 하는지 차분히 안내드리겠습니다.`
    ];
  }

  return [
    `${section.userQuestion}`,
    `${section.requiredEvidence}을 기준으로 보면, 이 섹션은 독자가 다음 결정을 내리기 전에 꼭 지나야 하는 확인 지점입니다.`
  ];
}

function techSectionCopy({ keyword, brand, product, job, section, index }) {
  if (index === 0) {
    return [
      `${keyword}을 검색하는 팀이 실제로 궁금해하는 건 기술 이름이 아닙니다. 우리 조직의 어떤 업무부터 바뀌는지, 기존 시스템과 충돌하지 않는지, 도입 후 성과를 어떻게 볼 수 있는지가 핵심입니다.`,
      `빠른 결론부터 말하면, ${keyword}은 솔루션을 하나 구매하는 문제가 아니라 업무 흐름을 다시 설계하는 문제에 가깝습니다. 도구는 그 다음입니다.`,
      `그래서 이 글은 기능 목록을 늘어놓기보다, 목차대로 도입 판단 기준과 운영 구조를 먼저 정리합니다. 이 목차가 맞다면 이후 본문에서 각 기준을 풀어가겠습니다.`
    ];
  }

  if (job.includes("왜 지금") || job.includes("중요")) {
    return [
      `최근 ${keyword}이 주목받는 이유는 단순히 AI 성능이 좋아졌기 때문만은 아닙니다. 반복 업무가 늘고, 의사결정 속도는 더 빨라졌고, 팀마다 흩어진 도구를 다시 묶어야 하는 압박이 커졌기 때문입니다.`,
      `이 변화는 IT팀만의 과제가 아닙니다. 영업, 마케팅, CS, 운영팀이 매일 처리하는 작은 업무 단위에서 먼저 체감됩니다. 그래서 최신 동향을 볼 때도 기술 뉴스보다 업무 변화에 초점을 맞춰야 합니다.`
    ];
  }

  if (job.includes("업무 흐름") || job.includes("운영")) {
    return [
      `${keyword} 도입의 첫 변화는 보고서 한 장을 자동으로 만드는 데서 끝나지 않습니다. 요청이 들어오고, 데이터를 확인하고, 담당자가 판단하고, 다음 액션으로 넘기는 흐름 전체가 바뀝니다.`,
      `좋은 AX 설계는 사람을 빼는 방식이 아니라 사람이 반복 확인하던 지점을 줄이는 방식입니다. 승인, 예외 처리, 로그 확인처럼 책임이 필요한 구간은 남기고, 반복 조회와 정리는 에이전트가 맡는 구조가 현실적입니다.`
    ];
  }

  if (job.includes("전제") || job.includes("확인")) {
    return [
      `도입 전에 먼저 봐야 할 것은 모델 성능보다 데이터와 권한 구조입니다. 어떤 데이터에 접근할 수 있는지, 누가 승인하는지, 실패했을 때 로그가 남는지가 정리되지 않으면 좋은 모델을 써도 현업 적용이 어렵습니다.`,
      `또 하나는 업무 소유권입니다. 에이전트가 일을 대신하더라도 최종 책임자가 누구인지 정해야 합니다. 이 기준이 없으면 자동화는 빨라지지만 운영 리스크도 같이 커집니다.`
    ];
  }

  if (job.includes("실패")) {
    return [
      `실패하는 팀은 대개 시작점이 비슷합니다. 큰 그림 없이 여러 부서에 챗봇을 나눠주고, 사용률이 낮아지면 모델 탓을 합니다.`,
      `하지만 문제는 모델보다 업무 정의에 있는 경우가 많습니다. 어떤 입력을 받고, 어떤 판단을 하고, 어떤 출력이 다음 사람에게 넘어가야 하는지 정하지 않으면 AI는 그럴듯한 답만 만들고 실제 업무는 바뀌지 않습니다.`
    ];
  }

  if (job.includes("로드맵") || job.includes("작게")) {
    return [
      `처음부터 전사 자동화를 목표로 잡으면 속도가 느려집니다. 먼저 반복 빈도가 높고, 판단 기준이 비교적 분명하며, 실패 비용이 낮은 업무를 고르는 편이 좋습니다.`,
      `예를 들면 문의 분류, 리드 요약, 내부 자료 검색, 캠페인 리포트 초안처럼 작은 단위가 출발점이 됩니다. 여기서 성과 지표와 예외 처리를 검증한 뒤 더 큰 업무로 넓혀야 합니다.`
    ];
  }

  if (job.includes("솔루션") || job.includes("파트너") || job.includes("선택")) {
    return [
      `솔루션을 볼 때는 데모 화면보다 운영 기준을 먼저 봐야 합니다. 권한 관리, 로그, 기존 도구 연동, 현업 수정 가능성, 실패 시 복구 흐름이 실제 도입 난이도를 결정합니다.`,
      `특히 ${keyword}처럼 조직 업무에 깊게 들어가는 주제는 예쁜 UI만으로 판단하기 어렵습니다. 작은 PoC에서 실제 데이터를 넣어보고, 담당자가 매일 쓸 수 있는 흐름인지 확인해야 합니다.`
    ];
  }

  if (job.includes("브랜드") || job.includes("제품") || job.includes("서비스")) {
    return [
      `${brand}의 ${product}은 AI 기능을 붙이는 데서 출발하지 않습니다. 먼저 팀의 반복 업무와 의사결정 흐름을 나누고, 어디를 자동화하고 어디를 사람이 승인해야 하는지 구조를 잡습니다.`,
      `이 접근은 느려 보일 수 있지만 운영 단계에서는 오히려 빠릅니다. 처음부터 책임, 데이터, 성과 지표를 함께 설계하면 도입 이후의 혼란을 줄일 수 있습니다.`
    ];
  }

  if (job.includes("CTA") || job.includes("문의") || job.includes("상담") || job.includes("자료")) {
    return [
      `${keyword}을 검토 중이라면 먼저 우리 조직의 반복 업무를 한두 개만 골라보는 것이 좋습니다. 그 업무가 자동화에 맞는지 확인하는 것만으로도 방향이 꽤 선명해집니다.`,
      `${brand}는 ${product}을 통해 도입 전 진단, PoC 설계, 운영 지표 정의까지 함께 정리합니다. 필요하다면 현재 업무 흐름을 기준으로 어디부터 시작할지 같이 보겠습니다.`
    ];
  }

  return [
    section.userQuestion,
    `${section.requiredEvidence}를 기준으로 보면, 이 섹션은 독자가 도입 여부를 판단하기 전에 반드시 확인해야 할 운영 포인트입니다.`
  ];
}

function buildImageBriefs(input, architecture) {
  const base = filenameToken(input.primaryKeyword);
  return architecture.sections
    .filter((section) => section.imageNeed !== "none")
    .slice(0, 5)
    .map((section, index) => ({
      sectionId: section.id,
      placementAfterH2: section.h2,
      type: section.imageNeed,
      prompt:
        `Korean SEO blog image for "${input.primaryKeyword}". ` +
        `Purpose: ${section.imageNeed}. ` +
        `${isTechCategory(input.category) ? "B2B IT editorial visual, workflow-focused, no medical imagery. " : ""}` +
        `Clean editorial style, trustworthy, realistic, readable composition, no exaggerated ad copy.`,
      alt: `${input.primaryKeyword} ${section.h2}`,
      filename: `${base}-${String(index + 1).padStart(2, "0")}.webp`,
      targetSize: index === 0 ? "1200x675" : "1024x576",
      status: "prompt-ready"
    }));
}

function buildConversionBlock(input, contentId) {
  const ctaId = `${contentId}_primary_cta`;
  const tech = isTechCategory(input.category);
  return {
    headline: tech
      ? `${input.primaryKeyword}을 검토 중이라면, 먼저 적용 가능한 업무부터 좁혀보세요.`
      : `${input.primaryKeyword} 때문에 고민 중이라면, 먼저 현재 상황부터 확인해보세요.`,
    body:
      tech
        ? `${input.brandName}의 ${input.productName}은 기능 소개보다 업무 흐름, 데이터 권한, 성과 지표를 먼저 정리해 도입 판단을 돕습니다.`
        : `${input.brandName}의 ${input.productName} 서비스는 독자가 놓치기 쉬운 조건, 위험 요소, 다음 행동을 함께 정리해 상담 전 판단 부담을 줄이는 데 초점을 둡니다.`,
    buttonLabel: input.leadGoal,
    formFields: ["name", "phone", "interest", "privacy_consent"],
    dataLayerEvent: {
      event: "lead_submit",
      content_id: contentId,
      cta_id: ctaId,
      lead_type: input.leadGoal,
      category: input.category,
      primary_keyword: input.primaryKeyword
    }
  };
}

function buildHtmlStructure(sections) {
  return [
    { area: "header", element: "site-header", purpose: "브랜드, 카테고리, 템플릿 표시" },
    { area: "article", element: "h1 + intro", purpose: "검색 의도에 대한 빠른 결론" },
    { area: "article", element: "nav.toc", purpose: "본문 시작 전 목차와 앵커 링크" },
    ...sections.map((section) => ({
      area: "article-section",
      element: `section#${section.id}`,
      heading: section.h2,
      imagePlacement: section.imageNeed === "none" ? "none" : "right after h2",
      purpose: section.userQuestion
    })),
    { area: "conversion", element: "aside.cta", purpose: "lead_submit GTM 이벤트가 연결된 CTA form" },
    { area: "related", element: "section.related", purpose: "동일 클러스터 글 더보기" }
  ];
}

function isTechCategory(category = "") {
  const lower = String(category).toLowerCase();
  return ["ax", "it", "saas", "b2b", "ai", "software", "tech"].some((term) =>
    lower.includes(term)
  );
}

function buildStructuredData(input, contentId, architecture, imageBriefs) {
  const canonicalUrl = `https://example.com/blog/${encodeURIComponent(architecture.slug)}`;
  const imageUrls = imageBriefs.map(
    (image) => `https://example.com/assets/blog/${encodeURIComponent(image.filename)}`
  );
  const graph = [
    {
      "@type": "BlogPosting",
      "@id": `${canonicalUrl}#article`,
      headline: architecture.h1,
      description: architecture.metaDescription,
      inLanguage: "ko-KR",
      mainEntityOfPage: canonicalUrl,
      image: imageUrls,
      author: {
        "@type": "Organization",
        name: input.brandName
      },
      publisher: {
        "@type": "Organization",
        name: input.brandName
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: "https://example.com/blog"
        },
        {
          "@type": "ListItem",
          position: 2,
          name: input.category,
          item: `https://example.com/blog/category/${encodeURIComponent(input.category)}`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: architecture.h1,
          item: canonicalUrl
        }
      ]
    }
  ];

  if (architecture.schemaTargets.includes("FAQPage")) {
    const tech = isTechCategory(input.category);
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: `${input.primaryKeyword} 관련해서 가장 먼저 확인할 점은 무엇인가요?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: tech
              ? "도입 목적, 자동화할 업무 범위, 데이터 접근 권한, 보안 기준, 성과 지표를 먼저 확인해야 합니다."
              : "개인 상황, 목적, 비용, 위험 요소를 함께 확인해야 합니다. 단정이 어려운 주제는 전문가 상담으로 현재 조건을 먼저 확인하는 편이 안전합니다."
          }
        },
        {
          "@type": "Question",
          name: tech ? "도입 검토 전 어떤 내용을 준비하면 좋나요?" : "상담 전 어떤 내용을 준비하면 좋나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: tech
              ? "반복 업무 목록, 사용하는 SaaS/시스템, 데이터 위치, 승인 흐름, 예상 예산과 일정을 정리해두면 PoC 범위를 빠르게 잡을 수 있습니다."
              : "현재 상태, 복용 중인 약, 과거 이력, 원하는 결과, 예산과 일정에 대한 기준을 정리해두면 상담이 더 정확해집니다."
          }
        }
      ]
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
    content_id: contentId
  };
}

function buildPublishingPayload(input, contentId, architecture, humanized, imageBriefs) {
  const canonicalPath = `/blog/${architecture.slug}`;
  const jsonLd = buildStructuredData(input, contentId, architecture, imageBriefs);
  return {
    ownedBlog: {
      platform: "Next.js + Headless WordPress",
      contentId,
      title: architecture.h1,
      slug: architecture.slug,
      canonicalPath,
      metaTitle: architecture.metaTitle,
      metaDescription: architecture.metaDescription,
      bodyMarkdown: humanized.markdown,
      tableOfContents: architecture.tableOfContents,
      htmlStructure: architecture.htmlStructure,
      schemaTargets: architecture.schemaTargets,
      jsonLd,
      images: imageBriefs,
      status: "draft-ready"
    },
    naverSupport: {
      role: "support-channel-only",
      duplicateContentPolicy:
        "Do not copy this article. Re-plan title, intro, examples, section order, and CTA from the master brief.",
      suggestedAngle:
        `${topicPhrase(
          input.primaryKeyword
        )} 검색 전에 사람들이 먼저 헷갈리는 기준을 네이버 독자용으로 쉽게 풀어주는 보조 글.`,
      status: input.channel === "naver-support" ? "needs-derivative-copy" : "optional"
    }
  };
}

function buildMeasurementPlan(input, contentId, architecture) {
  return {
    contentId,
    dataLayerOnPageView: {
      event: "content_view",
      content_id: contentId,
      channel: input.channel,
      category: input.category,
      primary_keyword: input.primaryKeyword,
      template_slug: architecture.slug
    },
    ga4KeyEvents: ["lead_submit"],
    gscChecks: [
      "URL Inspection after publish",
      "Daily query/page clicks, impressions, CTR, avg_position",
      "Indexing status and canonical status"
    ],
    dailyPerformanceFields: [
      "date",
      "impressions",
      "clicks",
      "ctr",
      "avg_position",
      "organic_sessions",
      "cta_clicks",
      "lead_submits",
      "lead_rate"
    ],
    reinforcementRule:
      "Strengthen keyword/template/CTA patterns when impressions grow, CTR is above cluster median, and lead rate improves. Weaken or rewrite when impressions exist but CTR or lead rate is weak."
  };
}

function buildLoopBase(rawInput = {}) {
  const input = normalizeInput(rawInput);
  const contentId = createContentId(input);
  const keywordBrief = buildKeywordBrief(input);
  const keywordResearch = suggestKeywords(input);
  const template = selectTemplate({
    keyword: input.primaryKeyword,
    category: input.category,
    forcedTemplateId: input.templateId
  });
  const architecture = buildArchitecture(input, template, keywordBrief);
  const imageBriefs = buildImageBriefs(input, architecture);
  const conversion = buildConversionBlock(input, contentId);
  const measurement = buildMeasurementPlan(input, contentId, architecture);
  const seoGates = buildSeoGateReport({
    category: input.category,
    channel: input.channel,
    hasFaq: template.schema.includes("FAQPage")
  });

  return {
    generatedAt: new Date().toISOString(),
    input,
    contentId,
    nodes: agentNodes,
    edges: agentEdges,
    dataTables,
    templates: articleTemplates,
    integrationAdapters,
    selectedTemplate: template,
    keywordBrief,
    keywordResearch,
    benchmarkInsights,
    seoGates,
    architecture,
    imageBriefs,
    conversion,
    measurement,
    performanceSimulation: simulatePerformanceLoop(rawInput.performanceMetrics),
    scheduleProposal: proposeSchedule({
      channel: input.channel,
      category: input.category,
      primaryKeyword: input.primaryKeyword,
      count: 4
    }),
    nextActions: [
      "Connect live keyword-volume adapters.",
      "Replace local fallback writer with Claude API adapter.",
      "Replace image prompt-ready status with GPT image generation adapter.",
      "Connect WordPress draft creation.",
      "Connect GTM/GA4/GSC collection jobs."
    ]
  };
}

function emptyHumanizedArticle() {
  return {
    engine: "not-generated",
    source: {
      name: "outline-only",
      appliedScope: "no article body has been generated yet"
    },
    rules: [],
    audit: {
      grade: "pending",
      changeRate: 0,
      before: { findingCount: 0, severityCounts: { S1: 0, S2: 0, S3: 0 }, findings: [] },
      after: { findingCount: 0, severityCounts: { S1: 0, S2: 0, S3: 0 }, findings: [] },
      summary: "본문 작성 전입니다. 목차 승인 후 Claude 작성 단계를 실행하세요.",
      highlights: []
    },
    markdown: ""
  };
}

function evaluateOutlineQuality(result) {
  const checks = [
    {
      id: "category-template-fit",
      label: "Category-specific template is selected",
      passed:
        result.selectedTemplate.bestFor.includes(result.input.category) ||
        result.selectedTemplate.bestFor.some((item) => result.input.category.includes(item))
    },
    {
      id: "toc-ready",
      label: "TOC has enough H2 sections",
      passed: result.architecture.tableOfContents.length >= 6
    },
    {
      id: "image-slots",
      label: "Image placements are mapped to sections",
      passed: result.imageBriefs.every((image) => image.sectionId && image.placementAfterH2)
    },
    {
      id: "html-structure",
      label: "HTML export structure exists",
      passed: result.architecture.htmlStructure.length >= result.architecture.sections.length
    }
  ];
  const passed = checks.filter((check) => check.passed).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    status: passed === checks.length ? "outline-ready" : "outline-needs-review",
    checks: checks.map((check) => ({ ...check, weight: 1 }))
  };
}

export function runOutlineLoop(rawInput = {}) {
  const base = buildLoopBase(rawInput);
  const humanized = emptyHumanizedArticle();
  const publishing = buildPublishingPayload(
    base.input,
    base.contentId,
    base.architecture,
    humanized,
    base.imageBriefs
  );
  publishing.ownedBlog.status = "outline-ready";
  const result = {
    ...base,
    contentStage: "outline-only",
    writerStatus: "not-started",
    draft: null,
    humanized,
    publishing
  };
  const withQuality = {
    ...result,
    qualityReport: evaluateOutlineQuality(result)
  };
  return {
    ...withQuality,
    schemaValidation: validateStructuredData(withQuality)
  };
}

export function applyClaudeOutline(outlineRun, claudeResult) {
  const outline = claudeResult.output || {};
  const sections = normalizeClaudeSections(outline.sections, outlineRun.architecture.sections);
  const architecture = {
    ...outlineRun.architecture,
    h1: cleanText(outline.h1) || outlineRun.architecture.h1,
    metaTitle: cleanText(outline.metaTitle) || outlineRun.architecture.metaTitle,
    metaDescription: cleanText(outline.metaDescription) || outlineRun.architecture.metaDescription,
    conclusionFirst: cleanText(outline.conclusionFirst) || outlineRun.architecture.conclusionFirst,
    sections,
    tableOfContents: sections.map((section, index) => ({
      order: index + 1,
      id: section.id,
      h2: section.h2,
      userQuestion: section.userQuestion,
      imageNeed: section.imageNeed,
      imagePlacement: section.imageNeed === "none" ? "none" : `after ${section.id}`
    })),
    htmlStructure: buildHtmlStructure(sections),
    internalLinkPlan: Array.isArray(outline.internalLinkPlan)
      ? outline.internalLinkPlan.map(cleanText).filter(Boolean)
      : outlineRun.architecture.internalLinkPlan,
    outlineRationale: cleanText(outline.outlineRationale)
  };
  const imageBriefs = buildImageBriefs(outlineRun.input, architecture);
  const publishing = buildPublishingPayload(
    outlineRun.input,
    outlineRun.contentId,
    architecture,
    outlineRun.humanized,
    imageBriefs
  );
  publishing.ownedBlog.status = "claude-outline-ready";
  const result = {
    ...outlineRun,
    contentStage: "claude-outline",
    writerStatus: "outline-generated-by-claude",
    outlineSource: {
      provider: claudeResult.provider,
      adapterId: claudeResult.adapterId,
      mode: claudeResult.mode,
      model: claudeResult.model,
      status: claudeResult.status,
      generatedAt: new Date().toISOString()
    },
    architecture,
    imageBriefs,
    publishing
  };
  const withQuality = {
    ...result,
    qualityReport: evaluateOutlineQuality(result)
  };
  return {
    ...withQuality,
    schemaValidation: validateStructuredData(withQuality)
  };
}

function normalizeClaudeSections(sections, fallbackSections) {
  const source = Array.isArray(sections) && sections.length >= 5 ? sections : fallbackSections;
  return source.slice(0, 10).map((section, index) => {
    const fallback = fallbackSections[index] || fallbackSections[fallbackSections.length - 1] || {};
    const rawH2 = cleanText(section.h2) || fallback.h2 || `섹션 ${index + 1}`;
    const rawQuestion =
      cleanText(section.userQuestion) || fallback.userQuestion || "이 섹션에서 무엇을 답해야 할까?";
    return {
      id: `section_${String(index + 1).padStart(2, "0")}`,
      h2: normalizeOutlineHeading(rawH2),
      job: cleanText(section.job) || fallback.job || "section",
      userQuestion: normalizeReaderQuestion(rawQuestion),
      requiredEvidence:
        normalizeEvidenceLine(
          cleanText(section.requiredEvidence) || fallback.requiredEvidence || "근거와 사례"
        ),
      imageNeed: normalizeImageNeed(section.imageNeed || fallback.imageNeed)
    };
  });
}

function normalizeOutlineHeading(value) {
  return String(value || "")
    .trim()
    .replace(/^\s*(?:\d+[\.)]|[①-⑳])\s*/u, "")
    .replace(/\s+\{#[A-Za-z0-9_-]+\}\s*$/u, "")
    .replace(/[?？!！.。]+$/u, "")
    .replace(/^왜\s+(.+?)인가$/u, "$1인 이유")
    .replace(/^왜\s+(.+?)는가$/u, "$1는 이유")
    .replace(/왔는 이유$/u, "온 이유")
    .replace(/어떻게\s+(.+?)는가$/u, "$1는 방식")
    .replace(/어떻게\s+(.+?)한가$/u, "$1하는 방식")
    .replace(/\s*(?:은|는)\s+무엇(?:인가요|인가)?$/u, "")
    .replace(/\s*무엇(?:인가요|인가)$/u, "")
    .replace(/\s*입니다$/u, "")
    .replace(/\s*합니다$/u, "")
    .replace(/\s*인가요$/u, "")
    .replace(/\s*인가$/u, "")
    .replace(/\s*일까요$/u, "")
    .replace(/\s*일까$/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeReaderQuestion(value) {
  const text = String(value || "")
    .trim()
    .replace(/^\s*(?:\d+[\.)]|[①-⑳])\s*/u, "")
    .replace(/\s+\{#[A-Za-z0-9_-]+\}\s*$/u, "")
    .replace(/[?？!！.。]+$/u, "")
    .replace(/\s{2,}/g, " ");

  const converted = text
    .replace(/무엇인가$/u, "무엇인가요")
    .replace(/무엇일까$/u, "무엇인가요")
    .replace(/무엇일까요$/u, "무엇인가요")
    .replace(/왜\s+(.+)인가$/u, "왜 $1인가요")
    .replace(/어떻게\s+(.+)는가$/u, "어떻게 $1나요")
    .replace(/어떻게\s+(.+)한가$/u, "어떻게 $1하나요")
    .replace(/어떻게\s+(.+)할까$/u, "어떻게 $1할까요")
    .replace(/해야\s+하는가$/u, "해야 하나요")
    .replace(/되는가$/u, "되나요")
    .replace(/인가$/u, "인가요")
    .replace(/한가$/u, "하나요")
    .replace(/는가$/u, "나요")
    .replace(/까$/u, "까요");

  if (/[요까]$/u.test(converted)) return `${converted}?`;
  if (/입니다$/u.test(converted) || /합니다$/u.test(converted)) return `${converted}`;
  return `${converted}인가요?`;
}

function normalizeEvidenceLine(value) {
  return String(value || "")
    .trim()
    .replace(/[.。]+$/u, "")
    .replace(/\s{2,}/g, " ");
}

function normalizeImageNeed(value) {
  const allowed = new Set([
    "none",
    "workflow diagram",
    "implementation roadmap visual",
    "risk checklist infographic",
    "solution comparison table",
    "product architecture visual",
    "contextual explanatory image",
    "step-by-step visual",
    "comparison table or infographic",
    "caution infographic",
    "brand trust visual"
  ]);
  const normalized = cleanText(value).toLowerCase();
  return allowed.has(normalized) ? normalized : "none";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function runContentLoop(rawInput = {}) {
  const base = buildLoopBase(rawInput);
  const draft = buildDraft(base.input, base.architecture);
  const humanized = humanizeDraft(draft);
  const publishing = buildPublishingPayload(
    base.input,
    base.contentId,
    base.architecture,
    humanized,
    base.imageBriefs
  );
  const result = {
    ...base,
    contentStage: "local-draft",
    writerStatus: "local-fallback-generated",
    draft,
    humanized,
    publishing
  };
  const withQuality = {
    ...result,
    qualityReport: evaluateQuality(result)
  };
  return {
    ...withQuality,
    schemaValidation: validateStructuredData(withQuality)
  };
}
