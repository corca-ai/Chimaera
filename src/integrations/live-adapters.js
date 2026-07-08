import "../config/env.js";
import { polishGeneratedMarkdown } from "../core/humanization.js";
import { integrationAdapters } from "./adapters.js";

const envMap = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  WORDPRESS_BASE_URL: process.env.WORDPRESS_BASE_URL,
  WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME,
  WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD,
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  GSC_SITE_URL: process.env.GSC_SITE_URL,
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID
};

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";
const INPUT_ENHANCE_FIELDS = {
  primaryKeyword: {
    name: "primaryKeyword",
    label: "핵심 키워드",
    instruction:
      "검색 수요와 독자 의도를 함께 담는 한국어 SEO 핵심 키워드로 다듬는다. 제목처럼 길게 쓰지 말고, 검색창에 입력할 법한 표현으로 만든다."
  },
  writingInstruction: {
    name: "writingInstruction",
    label: "이번 글 작성 지시",
    multiline: true,
    instruction:
      "작성자가 실제로 편집 지시로 쓸 수 있게 구체화한다. 글의 관점, 제외할 문맥, 앞쪽에 둘 판단 기준, CTA 연결 방식까지 자연스럽게 보강한다."
  },
  audience: {
    name: "audience",
    label: "타깃 독자",
    instruction:
      "이 글을 검색해서 들어올 사람을 더 선명하게 좁힌다. 직무, 상황, 고민, 의사결정 역할이 드러나게 정리한다."
  },
  brandName: {
    name: "brandName",
    label: "브랜드",
    instruction:
      "브랜드명은 임의로 바꾸지 않는다. 표기 흔들림이 있으면 공식 표기처럼 깔끔하게 정리한다."
  },
  productName: {
    name: "productName",
    label: "제품/서비스",
    instruction:
      "문제 해결 관점이 드러나도록 제품/서비스명을 다듬는다. 과장된 수식어보다 실제 제공 범위가 보이게 한다."
  },
  leadGoal: {
    name: "leadGoal",
    label: "리드 목표",
    instruction:
      "블로그 마지막 CTA로 자연스럽게 이어질 전환 목표로 다듬는다. 사용자가 부담 없이 행동할 수 있는 표현으로 만든다."
  }
};

export function getIntegrationStatus() {
  return integrationAdapters.map((adapter) => {
    const forceDryRun = process.env.SEO_LOOP_FORCE_DRY_RUN === "1";
    const missingSecrets = forceDryRun
      ? adapter.requiredSecrets
      : adapter.requiredSecrets.filter((secret) => !envMap[secret]);
    const status = {
      ...adapter,
      mode: missingSecrets.length ? "dry-run" : "live-ready",
      missingSecrets,
      ready: missingSecrets.length === 0
    };
    if (adapter.id === "claude-writing") {
      status.defaultModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    }
    return status;
  });
}

export async function runLiveAdapter(adapterId, run) {
  const status = getIntegrationStatus().find((adapter) => adapter.id === adapterId);
  if (!status) {
    return {
      adapterId,
      mode: "error",
      ok: false,
      error: `Unknown adapter: ${adapterId}`
    };
  }

  if (!status.ready) {
    return dryRunResult(status, run);
  }

  if (adapterId === "claude-writing") return callClaudeWriter(run);
  if (adapterId === "gpt-image") return callOpenAIImages(run);
  if (adapterId === "wordpress-headless") return createWordPressDraft(run);
  if (adapterId === "google-search-console") return dryRunResult(status, run, "live connector scaffolded");
  if (adapterId === "ga4-data") return dryRunResult(status, run, "live connector scaffolded");
  if (adapterId === "gtm-schema") return validateGtmSchema(run);

  return dryRunResult(status, run);
}

export async function generateClaudeOutline(run) {
  const model = run.input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const effort = run.input.anthropicEffort || "high";
  if (!envMap.ANTHROPIC_API_KEY) {
    return {
      adapterId: "claude-outline",
      provider: "Anthropic Claude API",
      mode: "missing-credentials",
      model,
      effort,
      ok: false,
      error: "ANTHROPIC_API_KEY is missing"
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": envMap.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 5000,
      messages: [
        {
          role: "user",
          content: buildOutlinePrompt(run, effort)
        }
      ]
    })
  });

  const payload = await response.json();
  const text = extractText(payload);
  const parsed = response.ok ? parseJsonObject(text) : null;
  return {
    adapterId: "claude-outline",
    provider: "Anthropic Claude API",
    mode: "live",
    model,
    effort,
    ok: response.ok && Boolean(parsed),
    status: response.status,
    output: parsed,
    rawText: parsed ? "" : text,
    error: response.ok
      ? parsed
        ? null
        : "Claude outline response was not valid JSON"
      : payload.error || payload
  };
}

export async function enhanceInputField(input = {}, fieldName = "") {
  const field = INPUT_ENHANCE_FIELDS[fieldName];
  const model = input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const effort = input.anthropicEffort || "medium";
  if (!field) {
    return {
      ok: false,
      mode: "error",
      fieldName,
      model,
      error: `Unsupported input field: ${fieldName}`
    };
  }

  if (!envMap.ANTHROPIC_API_KEY || process.env.SEO_LOOP_FORCE_DRY_RUN === "1") {
    return {
      ok: true,
      mode: "local",
      fieldName,
      model,
      value: fallbackEnhancedInputValue(input, field)
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": envMap.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: buildInputEnhancementPrompt(input, field, effort)
        }
      ]
    })
  });

  const payload = await response.json();
  const text = extractText(payload);
  const parsed = response.ok ? parseJsonObject(text) : null;
  const value = parsed ? sanitizeEnhancedInputValue(parsed.value, field) : "";
  return {
    ok: response.ok && Boolean(parsed) && Boolean(value),
    mode: "live",
    provider: "Anthropic Claude API",
    fieldName,
    model,
    effort,
    status: response.status,
    value,
    rawText: value ? "" : text,
    error: response.ok
      ? parsed
        ? value
          ? null
          : "Claude input enhancement response value was empty"
        : "Claude input enhancement response was not valid JSON"
      : payload.error || payload
  };
}

export async function rewriteSelectedText(input = {}) {
  const model = input.runInput?.anthropicModel || input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const selectedText = String(input.selectedText || "").trim();
  const instruction = String(input.instruction || "").trim();
  if (!selectedText) {
    return {
      ok: false,
      mode: "error",
      model,
      error: "선택된 문장이 없습니다."
    };
  }
  if (!instruction) {
    return {
      ok: false,
      mode: "error",
      model,
      error: "수정 지시를 입력하세요."
    };
  }

  if (!envMap.ANTHROPIC_API_KEY || process.env.SEO_LOOP_FORCE_DRY_RUN === "1") {
    return {
      ok: true,
      mode: "local",
      model,
      replacementText: localRewriteSelectedText(selectedText, instruction),
      summary: localRevisionSummary("claude-rewrite", input)
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": envMap.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: buildSelectionRewritePrompt(input)
        }
      ]
    })
  });

  const payload = await response.json();
  const text = extractText(payload);
  const parsed = response.ok ? parseJsonObject(text) : null;
  const replacementText = polishGeneratedMarkdown(parsed?.replacementText || "");
  const summary = sanitizeOneLine(parsed?.summary || "");
  return {
    ok: response.ok && Boolean(parsed) && Boolean(replacementText),
    mode: "live",
    provider: "Anthropic Claude API",
    model,
    status: response.status,
    replacementText,
    summary: summary || localRevisionSummary("claude-rewrite", input),
    rawText: replacementText ? "" : text,
    error: response.ok
      ? parsed
        ? replacementText
          ? null
          : "Claude rewrite response replacementText was empty"
        : "Claude rewrite response was not valid JSON"
      : payload.error || payload
  };
}

export async function summarizeArticleRevision(input = {}) {
  const model = input.runInput?.anthropicModel || input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  if (!envMap.ANTHROPIC_API_KEY || process.env.SEO_LOOP_FORCE_DRY_RUN === "1") {
    return {
      ok: true,
      mode: "local",
      model,
      summary: localRevisionSummary(input.action || "manual-edit", input)
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": envMap.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: buildRevisionSummaryPrompt(input)
        }
      ]
    })
  });

  const payload = await response.json();
  const text = extractText(payload);
  const parsed = response.ok ? parseJsonObject(text) : null;
  const summary = sanitizeOneLine(parsed?.summary || "");
  return {
    ok: response.ok && Boolean(parsed) && Boolean(summary),
    mode: "live",
    provider: "Anthropic Claude API",
    model,
    status: response.status,
    summary: summary || localRevisionSummary(input.action || "manual-edit", input),
    error: response.ok
      ? parsed
        ? summary
          ? null
          : "Claude revision summary was empty"
        : "Claude revision summary response was not valid JSON"
      : payload.error || payload
  };
}

export async function runAllAdapters(run) {
  const results = [];
  for (const adapter of getIntegrationStatus()) {
    results.push(await runLiveAdapter(adapter.id, run));
  }
  return {
    executedAt: new Date().toISOString(),
    contentId: run.contentId,
    results
  };
}

function buildSelectionRewritePrompt(input) {
  return (
    "너는 한국어 SEO 블로그 본문을 현장에서 고치는 편집자다.\n" +
    "사용자가 드래그한 selectedText만 수정한다. 글 전체의 톤과 사실관계는 유지한다.\n" +
    "의료/법률/운동 등 다른 카테고리 표현은 사용자가 명시하지 않은 한 섞지 않는다.\n" +
    "번역투, 기계적인 문장, 과장된 마케팅 문장을 피한다.\n" +
    "출력은 반드시 JSON 객체 하나만 쓴다. 키는 replacementText, summary 두 개만 쓴다.\n" +
    "replacementText는 선택 영역을 대체할 한국어 문장이다. HTML 태그, Markdown 제목, 코드펜스는 쓰지 않는다.\n" +
    "summary는 이 수정이 무엇을 바꿨는지 1줄 한국어로 쓴다. 45자 안쪽으로 짧게 쓴다.\n\n" +
    JSON.stringify(
      {
        instruction: input.instruction || "",
        selectedText: input.selectedText || "",
        heading: input.heading || "",
        runInput: input.runInput || {},
        articleContext: clipText(input.fullArticleMarkdown || input.beforeMarkdown || "", 7000)
      },
      null,
      2
    )
  );
}

function buildRevisionSummaryPrompt(input) {
  return (
    "너는 블로그 원고 편집 기록을 남기는 편집장이다.\n" +
    "아래 전후 원고와 수정 지시를 보고, 이번 수정 내용을 1줄로 요약한다.\n" +
    "출력은 반드시 JSON 객체 하나만 쓴다. 키는 summary 하나만 쓴다.\n" +
    "summary는 한국어 45자 안쪽으로 짧게 쓴다. 과장하지 말고 실제 바뀐 점만 쓴다.\n\n" +
    JSON.stringify(
      {
        action: input.action || "manual-edit",
        instruction: input.instruction || "",
        heading: input.heading || "",
        selectedText: input.selectedText || "",
        replacementText: input.replacementText || "",
        beforeMarkdown: clipText(input.beforeMarkdown || "", 5000),
        afterMarkdown: clipText(input.afterMarkdown || "", 5000)
      },
      null,
      2
    )
  );
}

function buildInputEnhancementPrompt(input, field, effort) {
  return (
    "너는 한국어 SEO 블로그 기획 입력값을 다듬는 편집자다.\n" +
    "사용자가 이미 입력한 전체 문맥을 보고, targetField 하나만 개선한다.\n" +
    "referenceUrls는 참고 맥락으로만 사용하고 절대 수정하지 않는다. URL 내용을 실제로 읽었다고 단정하지 않는다.\n" +
    "의료, 법률, 운동 등 다른 카테고리 문맥은 사용자가 요청하지 않은 한 섞지 않는다.\n" +
    "번역투를 피하고, 사람이 직접 기획한 것처럼 자연스럽고 구체적으로 쓴다.\n" +
    `개선 강도는 ${effort}이다.\n\n` +
    `대상 필드: ${field.label} (${field.name})\n` +
    `개선 지시: ${field.instruction}\n\n` +
    "출력 규칙:\n" +
    "- 반드시 JSON 객체 하나만 출력한다.\n" +
    "- 키는 value 하나만 쓴다. 예: {\"value\":\"개선된 입력값\"}\n" +
    "- targetField가 브랜드명이라면 임의로 새 브랜드를 만들지 않는다.\n" +
    "- targetField가 핵심 키워드라면 한 줄로만 출력한다.\n" +
    "- targetField가 작성 지시라면 2~5문장 안에서 구체적인 편집 지시로 출력한다.\n\n" +
    "입력 문맥:\n" +
    JSON.stringify(
      {
        targetField: field.name,
        currentValue: input[field.name] || "",
        channel: input.channel || "",
        category: input.category || "",
        primaryKeyword: input.primaryKeyword || "",
        writingInstruction: input.writingInstruction || "",
        referenceUrls: input.referenceUrls || [],
        audience: input.audience || "",
        brandName: input.brandName || "",
        productName: input.productName || "",
        leadGoal: input.leadGoal || ""
      },
      null,
      2
    )
  );
}

function localRewriteSelectedText(selectedText, instruction) {
  const polished = polishGeneratedMarkdown(selectedText);
  if (/짧|간결|줄여/u.test(instruction)) return shortenKoreanText(polished);
  if (/부드럽|자연|사람/u.test(instruction)) {
    return polished
      .replace(/입니다\./g, "입니다.")
      .replace(/것입니다\./g, "점입니다.")
      .replace(/이를 통해/g, "이렇게 하면");
  }
  return polished;
}

function localRevisionSummary(action, input = {}) {
  const heading = sanitizeOneLine(input.heading || "본문");
  if (action === "claude-rewrite") return `${heading}의 선택 문장을 지시에 맞게 고쳤습니다.`;
  return `${heading} 편집본을 저장했습니다.`;
}

function shortenKoreanText(text) {
  const sentences = String(text)
    .split(/(?<=\.|요\.|다\.)\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, Math.max(1, Math.min(2, sentences.length))).join(" ");
}

function sanitizeOneLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim()
    .slice(0, 90);
}

function clipText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  const head = text.slice(0, Math.floor(maxLength * 0.6));
  const tail = text.slice(-Math.floor(maxLength * 0.35));
  return `${head}\n\n...[중간 생략]...\n\n${tail}`;
}

function sanitizeEnhancedInputValue(value, field, fallback = "") {
  const text = String(value || fallback || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/u, "")
    .trim();
  if (field.multiline) return text.replace(/\n{3,}/g, "\n\n");
  return text.replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim();
}

function fallbackEnhancedInputValue(input, field) {
  const currentValue = String(input[field.name] || "").trim();
  const keyword = String(input.primaryKeyword || "핵심 주제").trim();
  const category = String(input.category || "블로그").trim();
  const brand = String(input.brandName || "브랜드").trim();
  const product = String(input.productName || "제품/서비스").trim();
  if (field.name === "writingInstruction") {
    const base = currentValue || `${keyword}를 검색한 독자가 실제로 판단할 수 있는 글로 작성합니다.`;
    return `${base}\n\n도구 소개보다 독자의 현재 고민, 도입 전 확인할 조건, 실패를 줄이는 기준, ${brand}의 ${product}로 이어지는 상담 CTA를 자연스럽게 연결합니다.`;
  }
  if (currentValue) return currentValue;
  if (field.name === "primaryKeyword") return `${product} 도입 전략`;
  if (field.name === "audience") return `${category} 주제를 검토 중인 의사결정자와 실무 책임자`;
  if (field.name === "brandName") return brand === "브랜드" ? "The Moonlight" : brand;
  if (field.name === "productName") return product === "제품/서비스" ? `${brand} 컨설팅` : product;
  if (field.name === "leadGoal") return "도입 상담 신청";
  return currentValue;
}

function dryRunResult(status, run, note = "missing credentials") {
  return {
    adapterId: status.id,
    provider: status.provider,
    mode: "dry-run",
    ok: true,
    ready: status.ready,
    missingSecrets: status.missingSecrets,
    note,
    preview: buildAdapterPreview(status.id, run)
  };
}

function buildAdapterPreview(adapterId, run) {
  if (adapterId === "claude-writing") {
    return {
      promptInputs: {
        h1: run.architecture.h1,
        template: run.selectedTemplate.name,
        model: run.input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
        effort: run.input.anthropicEffort || "high",
        sections: run.architecture.sections.map((section) => section.h2),
        toneRules: run.humanized.rules
      }
    };
  }

  if (adapterId === "gpt-image") {
    return {
      imagePrompts: run.imageBriefs.map((image) => ({
        sectionId: image.sectionId,
        prompt: image.prompt,
        alt: image.alt,
        filename: image.filename
      }))
    };
  }

  if (adapterId === "wordpress-headless") {
    return {
      post: {
        title: run.publishing.ownedBlog.title,
        slug: run.publishing.ownedBlog.slug,
        status: "draft",
        meta: {
          content_id: run.contentId,
          canonical_path: run.publishing.ownedBlog.canonicalPath
        }
      }
    };
  }

  if (adapterId === "google-search-console") {
    return {
      checks: run.measurement.gscChecks,
      dimensions: ["page", "query", "date", "device"],
      content_id: run.contentId
    };
  }

  if (adapterId === "ga4-data") {
    return {
      eventNames: run.measurement.ga4KeyEvents,
      content_id: run.contentId,
      fields: run.measurement.dailyPerformanceFields
    };
  }

  if (adapterId === "gtm-schema") {
    return {
      events: [run.measurement.dataLayerOnPageView, run.conversion.dataLayerEvent]
    };
  }

  return { content_id: run.contentId };
}

async function callClaudeWriter(run) {
  const model = run.input.anthropicModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  const effort = run.input.anthropicEffort || "high";
  const requestBody = {
    model,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content:
          "다음 SEO 콘텐츠 목차와 HTML export 구조를 바탕으로 자연스러운 한국어 블로그 본문을 작성하세요.\n" +
          "반드시 카테고리와 주제를 지키고, 의료/법률/건강 문맥이 아닌 경우 해당 표현을 섞지 마세요.\n" +
          "사용자가 입력한 writingInstruction은 본문 방향을 정하는 최우선 편집 지시입니다. 충돌이 없으면 반드시 반영하세요.\n" +
          "사용자가 입력한 referenceUrls는 참고 자료 후보입니다. URL 내용을 읽었다고 단정하지 말고, 필요한 출처/추가 확인 링크로 자연스럽게 반영하세요.\n" +
          `작성 강도는 ${effort}입니다. 얕은 요약이 아니라 실제 실무자가 읽고 판단할 수 있는 깊이로 쓰세요.\n` +
          "출력은 Markdown 본문만 작성하세요. HTML 주석, {#section_id}, 이미지 삽입 위치 메모, 코드펜스는 절대 출력하지 마세요.\n" +
          "이미지는 별도 이미지 탭에서 처리하므로 본문에는 이미지 안내문을 넣지 마세요.\n" +
          "im-not-ai fast path 기준으로 번역투를 피하세요: '~에 대해', '~를 통해', '~에 있어서', '~와 관련하여', '~에 기반하여', '가지고 있다', '~에 의해', '결론적으로', '이를 통해', '주목할 만하다', '시사하는 바가 크다', '혁신적인', '것이다'식 결말을 남발하지 마세요.\n" +
          "본문 볼드와 불릿은 최소화하고, 문장 길이를 일부러 섞으세요. 단문도 쓰고, 설명이 필요한 문장은 길게 풀어도 됩니다.\n" +
          "CTA 문단은 과장하지 말고 사람이 직접 권하는 말처럼 쓰세요. '여기까지 읽으셨다면 다음 행동은 분명합니다' 같은 공식 문장은 쓰지 마세요.\n\n" +
          JSON.stringify(
            {
              input: run.input,
              architecture: run.architecture,
              tableOfContents: run.architecture.tableOfContents,
              htmlStructure: run.architecture.htmlStructure,
              seoGates: run.seoGates,
              humanizationAudit: run.humanized.audit,
              cta: run.conversion
            },
            null,
            2
          )
      }
    ]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": envMap.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(requestBody)
  });

  const payload = await response.json();
  const rawText = extractText(payload);
  const polishedText = rawText ? polishGeneratedMarkdown(rawText) : "";
  return {
    adapterId: "claude-writing",
    provider: "Anthropic Claude API",
    mode: "live",
    model,
    effort,
    ok: response.ok,
    status: response.status,
    output: polishedText
      ? {
          ...payload,
          text: polishedText,
          rawText,
          postProcessedBy: "im-not-ai-inspired-fast-path"
        }
      : payload
  };
}

function buildOutlinePrompt(run, effort) {
  return (
    "너는 한국어 SEO 블로그의 편집장이다. 지금 단계에서는 본문을 쓰지 말고 목차만 설계한다.\n" +
    "사용자가 IT/AX 글을 쓰는 경우 의료, 시술, 병원, 복용, 병력, 검사 같은 문맥을 절대 섞지 마라.\n" +
    "검색 의도에 맞는 H1/H2 목차, 각 섹션의 독자 질문, 필요한 근거, 이미지 삽입 위치, HTML export 의도를 설계한다.\n" +
    "사용자가 입력한 writingInstruction은 목차 설계의 최우선 지시다. 링크가 있으면 referenceUrls를 근거 후보와 확인할 자료로 반영한다.\n" +
    "단, referenceUrls의 본문을 실제로 읽었다고 단정하지 말고 URL 기반 참고 자료 후보로만 다룬다.\n" +
    `작성 강도는 ${effort}이다. 얕은 일반론이 아니라 실제 실무자가 검토할 수 있는 운영 구조 중심으로 설계한다.\n\n` +
    "목차 문체 규격:\n" +
    "- h2에는 번호를 붙이지 마라. 예: '1. 도입 전제' 금지, '도입 전제'만 출력.\n" +
    "- h2는 명사형 또는 짧은 제목형으로 통일한다. '~입니다', '~합니다', '~인가요?', '~무엇인가?' 같은 종결형을 쓰지 마라.\n" +
    "- userQuestion은 모두 존댓말 질문형으로 통일한다. 반드시 '~인가요?', '~하나요?', '~되나요?', '~할까요?' 중 하나로 끝낸다.\n" +
    "- userQuestion에 반말형 '~인가?', '~하는가?', '~무엇인가?'를 쓰지 마라.\n" +
    "- requiredEvidence는 문장 종결 없이 근거/소재 목록형으로 쓴다.\n\n" +
    "반드시 아래 JSON 형식만 출력한다. Markdown, 코드펜스, 설명 문장은 넣지 마라.\n" +
    (run.input.outlineRevisionInstruction
      ? `\n이번 요청은 목차 재작성이다. 반드시 아래 지시를 반영하라:\n${run.input.outlineRevisionInstruction}\n`
      : "") +
    JSON.stringify(
      {
        h1: "string",
        metaTitle: "string",
        metaDescription: "string",
        conclusionFirst: "string",
        outlineRationale: "string",
        sections: [
          {
            h2: "string",
            job: "section role",
            userQuestion: "reader question answered by this section",
            requiredEvidence: "evidence/source/material needed",
            imageNeed:
              "none | workflow diagram | implementation roadmap visual | risk checklist infographic | solution comparison table | product architecture visual | contextual explanatory image"
          }
        ],
        internalLinkPlan: ["string"]
      },
      null,
      2
    ) +
    "\n\n입력 데이터:\n" +
    JSON.stringify(
      {
        input: run.input,
        selectedTemplate: run.selectedTemplate,
        keywordBrief: run.keywordBrief,
        keywordResearch: run.keywordResearch,
        localSeedArchitecture: run.architecture,
        previousOutline: run.input.previousOutline,
        benchmarkInsights: run.benchmarkInsights,
        seoGates: run.seoGates
      },
      null,
      2
    )
  );
}

function extractText(payload) {
  if (typeof payload?.completion === "string") return payload.completion;
  if (typeof payload?.text === "string") return payload.text;
  if (!Array.isArray(payload?.content)) return "";
  return payload.content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text || "";
      return "";
    })
    .join("\n")
    .trim();
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function callOpenAIImages(run) {
  const firstImage = run.imageBriefs[0];
  if (!firstImage) {
    return {
      adapterId: "gpt-image",
      provider: "OpenAI Images API",
      mode: "live",
      ok: false,
      error: "No image briefs found"
    };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${envMap.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: firstImage.prompt,
      size: process.env.OPENAI_IMAGE_SIZE || "1024x1024"
    })
  });

  const payload = await response.json();
  return {
    adapterId: "gpt-image",
    provider: "OpenAI Images API",
    mode: "live",
    ok: response.ok,
    status: response.status,
    sectionId: firstImage.sectionId,
    output: payload
  };
}

async function createWordPressDraft(run) {
  const baseUrl = envMap.WORDPRESS_BASE_URL.replace(/\/$/, "");
  const token = Buffer.from(
    `${envMap.WORDPRESS_USERNAME}:${envMap.WORDPRESS_APP_PASSWORD}`
  ).toString("base64");

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${token}`
    },
    body: JSON.stringify({
      title: run.publishing.ownedBlog.title,
      slug: run.publishing.ownedBlog.slug,
      status: "draft",
      content: markdownToWordPressHtml(run.publishing.ownedBlog.bodyMarkdown),
      meta: {
        content_id: run.contentId,
        seo_loop_template: run.selectedTemplate.id
      }
    })
  });

  const payload = await response.json();
  return {
    adapterId: "wordpress-headless",
    provider: "WordPress REST API",
    mode: "live",
    ok: response.ok,
    status: response.status,
    output: payload
  };
}

function validateGtmSchema(run) {
  const required = ["event", "content_id", "category", "primary_keyword"];
  const pageViewMissing = required.filter((field) => !run.measurement.dataLayerOnPageView[field]);
  const leadMissing = ["event", "content_id", "cta_id", "lead_type"].filter(
    (field) => !run.conversion.dataLayerEvent[field]
  );
  return {
    adapterId: "gtm-schema",
    provider: "Google Tag Manager",
    mode: "schema-validation",
    ok: pageViewMissing.length === 0 && leadMissing.length === 0,
    output: {
      pageViewMissing,
      leadMissing,
      events: [run.measurement.dataLayerOnPageView, run.conversion.dataLayerEvent]
    }
  };
}

function markdownToWordPressHtml(markdown) {
  return markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
