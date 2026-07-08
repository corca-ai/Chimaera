const form = document.querySelector("#loop-form");
const magicButtons = document.querySelectorAll("[data-enhance-field]");
const performanceForm = document.querySelector("#performance-form");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const outlineOutput = document.querySelector("#outline-output");
const structureOutput = document.querySelector("#structure-output");
const bodyOutput = document.querySelector("#body-output");
const approveOutlineButton = document.querySelector("#approve-outline");
const rewriteOutlineButton = document.querySelector("#rewrite-outline");
const outlineRevisionInput = document.querySelector("#outline-revision");
const runClaudeButton = document.querySelector("#run-claude");
const previewOutput = document.querySelector("#preview-output");
const createPreviewButton = document.querySelector("#create-preview");
const packageOutput = document.querySelector("#package-output");
const createPackageButton = document.querySelector("#create-package");
const imageOutput = document.querySelector("#image-output");
const trackingOutput = document.querySelector("#tracking-output");
const historyOutput = document.querySelector("#history-output");
const refreshHistoryButton = document.querySelector("#refresh-history");
const toggleHistoryScopeButton = document.querySelector("#toggle-history-scope");

let latestResult = null;
let outlineApproved = false;
let latestClaudeRun = null;
let showAllHistory = false;
let currentEditedMarkdown = "";
let lastSavedEditorMarkdown = "";
let selectedEditorRange = null;
let selectedEditorText = "";
let latestRevisionDetail = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKst(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function recordTypeLabel(type) {
  return {
    run: "생성 기록",
    performance: "성과 기록",
    preview: "HTML 미리보기",
    package: "파일 내보내기",
    model: "모델 산출물",
    revision: "본문 편집 기록"
  }[type] || type;
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function markdownToHtml(markdown) {
  const lines = cleanGeneratedMarkdown(markdown).split("\n");
  return lines
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(cleanHeading(line.slice(2)))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${escapeHtml(cleanHeading(line.slice(3)))}</h2>`;
      if (line.startsWith("### ")) return `<h3>${escapeHtml(cleanHeading(line.slice(4)))}</h3>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function cleanHeading(value) {
  return String(value).replace(/\s+\{#[A-Za-z0-9_-]+\}\s*$/, "").trim();
}

function normalizeOutlineHeading(value) {
  return cleanHeading(value)
    .replace(/^\s*(?:\d+[\.)]|[①-⑳])\s*/u, "")
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
    .replace(/[?？!！.。]+$/u, "")
    .replace(/\s{2,}/g, " ");
  const converted = text
    .replace(/무엇인가$/u, "무엇인가요")
    .replace(/무엇일까$/u, "무엇인가요")
    .replace(/무엇일까요$/u, "무엇인가요")
    .replace(/해야\s+하는가$/u, "해야 하나요")
    .replace(/되는가$/u, "되나요")
    .replace(/인가$/u, "인가요")
    .replace(/한가$/u, "하나요")
    .replace(/는가$/u, "나요")
    .replace(/까$/u, "까요");
  if (/[요까]$/u.test(converted)) return `${converted}?`;
  return `${converted}인가요?`;
}

function cleanGeneratedMarkdown(markdown) {
  return String(markdown || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(\s{0,3}#{1,6}\s+.*?)\s+\{#[A-Za-z0-9_-]+\}\s*$/gm, "$1")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "$1")
    .replace(/여기까지 읽으셨다면 다음 행동은 분명합니다\.?/g, "이제 할 일은 복잡하지 않습니다.")
    .replace(/거창한 전사 계획을 세우는 게 아니라/g, "처음부터 전사 계획을 만들 필요는 없습니다")
    .replace(/적용 가능한 업무 하나를 좁히는 것/g, "바로 적용해 볼 업무 하나를 고르는 일")
    .replace(/어디서부터 작게 시작할 수 있는지 함께 점검해 드립니다/g, "어떤 업무부터 작게 시작하면 좋을지 같이 보겠습니다")
    .replace(/기능 소개보다 업무 흐름, 데이터 권한, 성과 지표를 먼저 정리해 도입 판단을 돕습니다/g, "기능을 길게 늘어놓기보다 업무 흐름, 데이터 권한, 성과 지표를 먼저 정리해 판단 기준을 잡아드립니다")
    .replace(/자동화에 적합한지부터 같이 판단해 드립니다/g, "자동화에 맞는 일인지부터 같이 판단하겠습니다")
    .replace(/말씀해 주시면/g, "알려주시면")
    .replace(/결론적으로,?\s*/g, "")
    .replace(/따라서,?\s*/g, "")
    .replace(/이를 통해,?\s*/g, "")
    .replace(/필요는 없습니다,\s*/g, "필요는 없습니다. ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractClaudeText(adapterRun) {
  const result = normalizeAdapterResults(adapterRun).find((item) => item.adapterId === "claude-writing");
  const output = result?.output;
  if (!output) return "";
  if (typeof output.text === "string") return output.text;
  if (typeof output.completion === "string") return output.completion;
  if (Array.isArray(output.content)) {
    return output.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text" && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function currentArticleMarkdown() {
  const editorMarkdown = readEditorMarkdown();
  if (editorMarkdown) return cleanGeneratedMarkdown(editorMarkdown);
  if (currentEditedMarkdown) return cleanGeneratedMarkdown(currentEditedMarkdown);
  return cleanGeneratedMarkdown(
    extractClaudeText(latestClaudeRun) || (hasFinalArticleBody(latestResult) ? latestResult.humanized.markdown : "")
  );
}

function buildExportPayload() {
  return {
    run: latestResult,
    runInput: readForm(),
    bodyMarkdown: currentArticleMarkdown()
  };
}

function readEditorMarkdown() {
  const editor = document.querySelector("#article-editor");
  if (!editor) return "";
  return articleElementToMarkdown(editor);
}

function articleElementToMarkdown(root) {
  const blocks = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = cleanBlockText(node.textContent);
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tagName = node.tagName.toLowerCase();
    const text = cleanBlockText(node.innerText || node.textContent || "");
    if (!text) return;
    if (tagName === "h1") blocks.push(`# ${text}`);
    else if (tagName === "h2") blocks.push(`## ${text}`);
    else if (tagName === "h3") blocks.push(`### ${text}`);
    else if (tagName === "ul" || tagName === "ol") {
      node.querySelectorAll("li").forEach((item) => {
        const itemText = cleanBlockText(item.innerText || item.textContent || "");
        if (itemText) blocks.push(`- ${itemText}`);
      });
    } else {
      blocks.push(text);
    }
  });
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanBlockText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasFinalArticleBody(result) {
  return Boolean(result?.humanized?.markdown && result.contentStage !== "outline-only");
}

function switchTab(tabId) {
  tabs.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === tabId));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === tabId));
}

function card(title, body, kicker = "") {
  return `
    <article class="card">
      ${kicker ? `<div class="kicker">${escapeHtml(kicker)}</div>` : ""}
      <h3>${escapeHtml(title)}</h3>
      ${body}
    </article>
  `;
}

async function initialize() {
  approveOutlineButton.disabled = true;
  rewriteOutlineButton.disabled = true;
  runClaudeButton.disabled = true;
  outlineOutput.innerHTML = card(
    "시작 전",
    "<p>왼쪽 입력값을 확인하고 시작하기를 누르세요. 이때 Claude API가 목차를 생성합니다.</p>",
    "idle"
  );
  structureOutput.innerHTML = card("HTML 구조", "<p>목차가 생성되면 HTML 구조가 표시됩니다.</p>", "waiting");
  bodyOutput.innerHTML = card("본문", "<p>목차 승인 후 Claude로 본문을 생성합니다.</p>", "waiting");
  renderPreview();
  renderPackage();
  imageOutput.innerHTML = card("Image Plan", "<p>Claude 목차 생성 후 섹션별 이미지 위치가 표시됩니다.</p>", "waiting");
  trackingOutput.innerHTML = card("Performance", "<p>콘텐츠 생성 후 성과 루프를 계산합니다.</p>", "waiting");
  renderHistoryEmpty();
}

function normalizeAdapterResults(adapterRun) {
  if (!adapterRun) return [];
  if (Array.isArray(adapterRun.results)) return adapterRun.results;
  if (Array.isArray(adapterRun.execution?.results)) return adapterRun.execution.results;
  if (adapterRun.adapterId) return [adapterRun];
  return [];
}

function renderOutline(result) {
  approveOutlineButton.disabled = !result || outlineApproved;
  approveOutlineButton.textContent = outlineApproved ? "목차 승인됨" : "목차 승인";
  rewriteOutlineButton.disabled = !result;
  runClaudeButton.disabled = !result;

  outlineOutput.innerHTML = `
    ${card(
      "Step 1. 목차 검토",
      `<p>Claude API가 생성한 목차입니다. H1, H2 흐름, 검색 의도, 이미지 삽입 위치를 먼저 확인하세요.</p>
       <p>마음에 들지 않으면 재작성 지시를 넣고 다시 쓰기를 누르세요.</p>`,
      outlineApproved ? "approved" : "outline-first"
    )}
    ${renderOutlinePlan(result)}
    ${card(
      "SEO Quality Gates",
      `<ul>${result.seoGates
        .map((gate) => `<li><strong>${escapeHtml(gate.label)}</strong>: ${escapeHtml(gate.check)}</li>`)
        .join("")}</ul>`,
      "google search grounding"
    )}
  `;
}

function renderStructure(result) {
  if (!result) {
    structureOutput.innerHTML = card("HTML 구조", "<p>목차 생성 후 표시됩니다.</p>", "waiting");
    return;
  }
  structureOutput.innerHTML =
    card(
      "Step 2. 초기 HTML 구조",
      "<p>실제 HTML export와 미리보기는 이 구조를 기준으로 생성됩니다.</p>",
      outlineApproved ? "ready" : "review"
    ) +
    renderHtmlStructure(result) +
    card(
      "Structured Data Validation",
      `<p><strong>${result.schemaValidation.score}/100</strong> · ${escapeHtml(
        result.schemaValidation.status
      )}</p><ul>${result.schemaValidation.checks
        .map((check) => `<li>${check.passed ? "PASS" : "REVIEW"} · ${escapeHtml(check.label)}</li>`)
        .join("")}</ul>`,
      "json-ld"
    ) +
    card(
      "Publishing Payload",
      `<pre>${escapeHtml(JSON.stringify(result.publishing.ownedBlog, null, 2))}</pre>`,
      "owned blog"
    );
}

function renderBody(result) {
  if (!result) {
    bodyOutput.innerHTML = card("본문", "<p>목차 승인 후 Claude로 본문을 생성합니다.</p>", "waiting");
    return;
  }

  const claudeResult = normalizeAdapterResults(latestClaudeRun)[0];
  const claudeText = extractClaudeText(latestClaudeRun);
  const sourceMarkdown = claudeText || (hasFinalArticleBody(result) ? result.humanized.markdown : "");
  if (sourceMarkdown && !currentEditedMarkdown) {
    currentEditedMarkdown = cleanGeneratedMarkdown(sourceMarkdown);
    lastSavedEditorMarkdown = currentEditedMarkdown;
  }
  const articleMarkdown = currentEditedMarkdown || sourceMarkdown;
  const claudeCard = latestClaudeRun
    ? card(
        "Claude Writing Run",
        `<p>Model: <code>${escapeHtml(
          claudeResult?.model || claudeResult?.preview?.promptInputs?.model || result.input.anthropicModel
        )}</code></p>
         <p>Mode: ${escapeHtml(claudeResult?.mode || "n/a")} · OK: ${claudeResult?.ok ? "yes" : "no"}</p>
         ${
           latestClaudeRun.modelArtifacts?.url
             ? `<p><a href="${escapeHtml(latestClaudeRun.modelArtifacts.url)}" target="_blank" rel="noreferrer">Claude artifact manifest 열기</a></p>`
             : ""
         }`,
        "claude"
      )
    : card(
        "Claude Writing",
        outlineApproved
          ? "<p>목차가 승인됐습니다. 이제 Claude API로 본문을 생성하세요.</p>"
          : "<p>본문 생성 전에 목차를 먼저 승인하세요.</p>",
        "waiting"
      );

  runClaudeButton.disabled = !outlineApproved;
  bodyOutput.innerHTML =
    card(
      "Step 3. 본문",
      articleMarkdown
        ? "<p>Claude 본문 결과입니다. 프리뷰와 파일 내보내기는 이 본문을 기준으로 진행합니다.</p>"
        : "<p>아직 본문이 없습니다. 목차 승인 후 Claude로 본문 생성을 실행하세요.</p>",
      articleMarkdown ? "generated" : "not generated"
    ) +
    claudeCard +
    (articleMarkdown
      ? renderBodyEditor(articleMarkdown)
      : "") +
    renderQualityCard(result) +
    (articleMarkdown ? renderHumanizationCard(result) : "");
  if (articleMarkdown) {
    updateSelectionPreview();
    refreshRevisionHistory();
  }
}

function renderBodyEditor(articleMarkdown) {
  return `
    <section class="body-editor-grid" aria-label="본문 편집 작업대">
      <article
        id="article-editor"
        class="article-shell article-editor"
        contenteditable="true"
        spellcheck="false"
        aria-label="본문 편집기"
      >${markdownToHtml(articleMarkdown)}</article>
      ${renderRevisionPanel()}
    </section>
  `;
}

function renderRevisionPanel() {
  return `
    <aside class="revision-panel" aria-label="본문 편집 기록">
      <article class="card editor-command">
        <div class="kicker">Inline Editor</div>
        <h3>선택 문장 수정</h3>
        <p>본문에서 문장을 드래그한 뒤, 아래에 수정 지시를 적고 Claude rewrite를 실행하세요.</p>
        <div class="selection-preview" id="selection-preview">아직 선택된 문장이 없습니다.</div>
        <label>
          Claude 수정 지시
          <textarea
            id="editor-rewrite-instruction"
            rows="4"
            spellcheck="false"
            placeholder="예: 번역투를 줄이고, 실무자가 말하듯 더 자연스럽게 바꿔줘."
          ></textarea>
        </label>
        <div class="editor-actions">
          <button id="rewrite-selection" type="button">선택 문장 Claude rewrite</button>
          <button id="save-manual-revision" type="button">현재 편집본 저장</button>
        </div>
      </article>
      <article class="card revision-tree-card">
        <div class="kicker">Local History</div>
        <h3>편집 기록</h3>
        <div id="revision-tree" class="revision-tree">저장된 편집 기록을 불러오는 중입니다.</div>
        <div id="revision-detail" class="revision-detail"></div>
      </article>
    </aside>
  `;
}

function renderQualityCard(result) {
  return card(
    result.contentStage === "outline-only" ? "Outline Quality" : "Quality Score",
    `<p><strong>${result.qualityReport.score}/100</strong> · ${escapeHtml(
      result.qualityReport.status
    )}</p><ul>${result.qualityReport.checks
      .map(
        (check) =>
          `<li>${check.passed ? "PASS" : "REVIEW"} · ${escapeHtml(check.label)}</li>`
      )
      .join("")}</ul>`,
    "quality"
  );
}

function renderHumanizationCard(result) {
  return card(
    "Humanization Audit",
    `<p>${escapeHtml(result.humanized.audit?.summary || "")}</p>
     <p>Grade: <strong>${escapeHtml(result.humanized.audit?.grade || "n/a")}</strong> · Change: ${Math.round(
      Number(result.humanized.audit?.changeRate || 0) * 100
    )}%</p>
     <p>Before: S1 ${escapeHtml(
      result.humanized.audit?.before?.severityCounts?.S1 ?? 0
    )}, S2 ${escapeHtml(result.humanized.audit?.before?.severityCounts?.S2 ?? 0)} · After: S1 ${escapeHtml(
      result.humanized.audit?.after?.severityCounts?.S1 ?? 0
    )}, S2 ${escapeHtml(result.humanized.audit?.after?.severityCounts?.S2 ?? 0)}</p>
     <ul>${(result.humanized.audit?.highlights || [])
       .slice(0, 5)
       .map((item) => `<li>${escapeHtml(item.id)} · ${escapeHtml(item.label)}</li>`)
       .join("")}</ul>`,
    "im-not-ai fast gate"
  );
}

function renderOutlinePlan(result) {
  const imageBySection = new Map(result.imageBriefs.map((image) => [image.sectionId, image]));
  const userBrief = renderUserBrief(result);
  const source = result.outlineSource
    ? card(
        "Outline Source",
        `<p>Claude API가 목차를 생성했습니다.</p>
         <p>Model: <code>${escapeHtml(result.outlineSource.model || "")}</code> · Mode: ${escapeHtml(
          result.outlineSource.mode || ""
        )}</p>
         <p>Status: ${escapeHtml(result.outlineSource.status || "")} · ${escapeHtml(
          formatKst(result.outlineSource.generatedAt)
        )} KST</p>`,
        "claude outline"
      )
    : card(
        "Outline Source",
        "<p>아직 Claude 목차 생성 정보가 없습니다. 시작하기는 Claude outline API를 호출해야 합니다.</p>",
        "needs claude"
      );
  const items = result.architecture.sections
    .map((section, index) => {
      const image = imageBySection.get(section.id);
      return `<li>
        <strong>${index + 1}. ${escapeHtml(normalizeOutlineHeading(section.h2))}</strong>
        <p><strong>독자 질문</strong> ${escapeHtml(normalizeReaderQuestion(section.userQuestion))}</p>
        <p><strong>근거/소재</strong> ${escapeHtml(section.requiredEvidence)}</p>
        <p>이미지: ${
          image
            ? `<code>${escapeHtml(image.filename)}</code> · ${escapeHtml(image.type)} · ${escapeHtml(
                image.targetSize
              )}`
            : "삽입 없음"
        }</p>
      </li>`;
    })
    .join("");

  return (
    source +
    userBrief +
    card(
      result.architecture.h1,
      `<p>${escapeHtml(result.architecture.metaDescription)}</p>
       <p>Template: ${escapeHtml(result.selectedTemplate.name)} · Category: ${escapeHtml(
        result.input.category
      )}</p>`,
      "h1"
    ) + card("목차", `<ol class="outline-list">${items}</ol>`, "toc")
  );
}

function renderUserBrief(result) {
  const instruction = result.input?.writingInstruction || "";
  const urls = result.input?.referenceUrls || [];
  if (!instruction && !urls.length) return "";
  return card(
    "사용자 지시",
    `${instruction ? `<p>${escapeHtml(instruction)}</p>` : ""}
     ${
       urls.length
         ? `<ul>${urls
             .map(
               (url) =>
                 `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(
                   url
                 )}</a></li>`
             )
             .join("")}</ul>`
         : ""
     }`,
    "brief"
  );
}

function renderHtmlStructure(result) {
  const rows = (result.architecture.htmlStructure || [])
    .map(
      (item) =>
        `<div class="metric-row"><span class="metric-label">${escapeHtml(
          item.element
        )}</span><span>${escapeHtml(item.heading || item.purpose || "")}${
          item.imagePlacement ? ` · image: ${escapeHtml(item.imagePlacement)}` : ""
        }</span></div>`
    )
    .join("");
  return card(
    "HTML Export Structure",
    `<p>프리뷰/패키지 HTML은 아래 순서로 구성됩니다.</p>${rows}`,
    "html"
  );
}

function renderPreview(previewResult = null) {
  const bodyReady = hasFinalArticleBody(latestResult) || Boolean(extractClaudeText(latestClaudeRun));
  createPreviewButton.disabled = latestResult?.contentStage === "outline-only" && !bodyReady;
  createPreviewButton.textContent = createPreviewButton.disabled
    ? "본문 생성 후 프리뷰"
    : "HTML 미리보기 생성";
  if (!previewResult) {
    previewOutput.innerHTML =
      card(
        "HTML 미리보기",
        bodyReady
          ? "<p>현재 본문으로 로컬 HTML 파일을 생성합니다. meta, canonical, JSON-LD, TOC, 이미지 위치, GTM dataLayer, CTA form을 함께 확인합니다.</p>"
          : "<p>아직 본문이 생성되지 않았습니다. 지금은 HTML export 구조만 검토하고, Claude 작성 후 프리뷰를 생성하세요.</p>",
        "waiting"
      ) + (latestResult ? renderHtmlStructure(latestResult) : "");
    return;
  }
  previewOutput.innerHTML =
    card(
      "HTML Preview Created",
      `<p><a href="${escapeHtml(previewResult.preview.url)}" target="_blank" rel="noreferrer">새 창에서 보기</a></p>
       <p>Schema: ${previewResult.schemaValidation.score}/100 · ${escapeHtml(
        previewResult.schemaValidation.status
      )}</p>
       <p><code>${escapeHtml(previewResult.preview.path)}</code></p>`,
      previewResult.preview.contentId
    ) +
    (latestResult ? renderHtmlStructure(latestResult) : "") +
    `<iframe class="preview-frame" src="${escapeHtml(previewResult.preview.url)}"></iframe>`;
}

function renderPackage(packageResult = null) {
  const bodyReady = hasFinalArticleBody(latestResult) || Boolean(extractClaudeText(latestClaudeRun));
  createPackageButton.disabled = latestResult?.contentStage === "outline-only" && !bodyReady;
  createPackageButton.textContent = createPackageButton.disabled
    ? "본문 생성 후 패키지"
    : "파일 내보내기";
  if (!packageResult) {
    packageOutput.innerHTML = card(
      "파일 내보내기",
      bodyReady
        ? "<p>현재 콘텐츠를 로컬 산출물 폴더로 저장합니다. WordPress payload, Next.js props, JSON-LD, GTM events, image briefs, 검수 체크리스트가 포함됩니다.</p>"
        : "<p>아직 본문이 생성되지 않았습니다. 파일 내보내기는 목차 승인과 본문 작성이 끝난 뒤 생성합니다.</p>",
      "waiting"
    );
    return;
  }
  const pkg = packageResult.package;
  packageOutput.innerHTML =
    card(
      "Files Exported",
      `<p><strong>${escapeHtml(pkg.title)}</strong></p>
       <p>Quality ${pkg.qualityScore}/100 · Schema ${pkg.schemaScore}/100</p>
       <p><code>${escapeHtml(pkg.path)}</code></p>`,
      pkg.contentId
    ) +
    pkg.files
      .map((file) =>
        card(
          file.filename,
          `<p><a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">열기</a></p>
           <p><code>${escapeHtml(file.path)}</code></p>`,
          "artifact"
        )
      )
      .join("");
}

function renderImages(result) {
  imageOutput.innerHTML = result.imageBriefs
    .map(
      (image) => `
        <article class="visual-card">
          <div class="visual-preview">${escapeHtml(image.type)}</div>
          <div class="visual-body">
            <h3>${escapeHtml(image.placementAfterH2)}</h3>
            <p><strong>ALT</strong> ${escapeHtml(image.alt)}</p>
            <p><strong>File</strong> <code>${escapeHtml(image.filename)}</code></p>
            <p>${escapeHtml(image.prompt)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTracking(result, savedSnapshot = null, performanceHistory = []) {
  trackingOutput.innerHTML = [
    card(
      "현재 콘텐츠",
      `<p><strong>${escapeHtml(result.input.primaryKeyword)}</strong></p>
       <p>${escapeHtml(result.input.category)} · <code>${escapeHtml(result.contentId)}</code></p>
       <p>아래 값은 실제 Search Console, GA4, GTM에서 확인한 뒤 입력해야 합니다. 기본 추정값은 저장하지 않습니다.</p>`,
      "current"
    ),
    card(
      "GTM page_view 계약",
      `<pre>${escapeHtml(JSON.stringify(result.measurement.dataLayerOnPageView, null, 2))}</pre>`,
      "page view"
    ),
    card(
      "GTM lead_submit 계약",
      `<pre>${escapeHtml(JSON.stringify(result.conversion.dataLayerEvent, null, 2))}</pre>`,
      "conversion"
    ),
    card(
      "저장할 성과 필드",
      result.measurement.dailyPerformanceFields
        .map(
          (field) =>
            `<div class="metric-row"><span class="metric-label">${escapeHtml(
              field
            )}</span><span>tracked</span></div>`
        )
        .join(""),
      "loop data"
    ),
    card(
      "강화/약화 기준",
      `<p>${escapeHtml(result.measurement.reinforcementRule)}</p>`,
      "learning"
    ),
    savedSnapshot
      ? card(
          "Performance Snapshot Saved",
          `<p><strong>${escapeHtml(savedSnapshot.contentId)}</strong> · ${escapeHtml(
            formatKst(savedSnapshot.recordedAt)
          )} KST</p>
           <p>${escapeHtml(savedSnapshot.summary)}</p>
           <p><code>${escapeHtml(savedSnapshot.path)}</code></p>`,
          savedSnapshot.source
        )
      : "",
    performanceHistory.length
      ? card(
          "현재 콘텐츠 성과 기록",
          `<p>현재 콘텐츠와 연결된 성과 스냅샷 ${performanceHistory.length}개를 불러왔습니다.</p>`,
          "stored"
        ) +
        performanceHistory
          .slice(0, 12)
          .map((snapshot) =>
            card(
              snapshot.primaryKeyword || snapshot.contentId || snapshot.id,
              `<p>${escapeHtml(snapshot.category || "")} · ${escapeHtml(
                formatKst(snapshot.recordedAt)
              )} KST</p>
               <p>${escapeHtml(snapshot.summary || "")}</p>
               <p>Actions: ${escapeHtml((snapshot.actions || []).join(", ") || "observe")}</p>
               <p><code>${escapeHtml(snapshot.path || "")}</code></p>`,
              snapshot.contentId || "performance"
            )
          )
          .join("")
      : card("현재 콘텐츠 성과 기록", "<p>아직 이 콘텐츠에 연결된 실제 성과 스냅샷이 없습니다.</p>", "empty")
  ].join("");
}

function renderHistoryEmpty() {
  historyOutput.innerHTML = card(
    "저장 기록",
    "<p>목차 생성, 본문 생성, HTML 미리보기, 파일 내보내기, 성과 저장 결과는 로컬 outputs 폴더에 남습니다. 콘텐츠 생성 후 현재 콘텐츠 기록을 확인하세요.</p>",
    "waiting"
  );
}

function renderHistory(items = []) {
  toggleHistoryScopeButton.textContent = showAllHistory ? "현재 콘텐츠만 보기" : "전체 기록 보기";
  const scopeText = showAllHistory
    ? "전체 로컬 기록입니다. 과거 테스트 데이터도 포함될 수 있습니다."
    : latestResult
      ? `현재 콘텐츠 ${latestResult.contentId}와 연결된 기록만 보여줍니다.`
      : "아직 현재 콘텐츠가 없어 기록을 좁혀 볼 수 없습니다.";

  if (!items.length) {
    historyOutput.innerHTML = card("저장 기록", `<p>${escapeHtml(scopeText)}</p><p>표시할 기록이 없습니다.</p>`, "empty");
    return;
  }

  historyOutput.innerHTML =
    card(
      "저장 기록",
      `<p>${escapeHtml(scopeText)}</p><p>한국시간(KST, UTC+09:00) 기준으로 표시합니다. 원본 파일은 ISO UTC 시간으로 저장됩니다.</p>`,
      showAllHistory ? "all" : "current"
    ) +
    items
      .map(
        (item) => `
          <article class="card history-card">
            <div class="history-head">
              <div>
                <div class="kicker">${escapeHtml(recordTypeLabel(item.type))}</div>
                <h3>${escapeHtml(item.title || item.contentId || item.id)}</h3>
              </div>
              <button type="button" data-history-type="${escapeHtml(item.type)}" data-history-id="${escapeHtml(
                item.id
              )}">상세 보기</button>
            </div>
            <p>${escapeHtml(item.subtitle || "")}</p>
            <p>${escapeHtml(item.category || "")} · ${escapeHtml(formatKst(item.createdAt))} KST</p>
            <p><code>${escapeHtml(item.contentId || "")}</code></p>
            ${item.url ? `<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">파일 열기</a></p>` : ""}
            <p><code>${escapeHtml(item.path || "")}</code></p>
            <div class="history-detail" data-history-detail="${escapeHtml(item.type)}:${escapeHtml(item.id)}"></div>
          </article>
        `
      )
      .join("");
}

function captureEditorSelection() {
  const editor = document.querySelector("#article-editor");
  const selection = window.getSelection();
  if (!editor || !selection || !selection.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  selectedEditorRange = range.cloneRange();
  selectedEditorText = selection.toString().trim();
  updateSelectionPreview();
}

function updateSelectionPreview(message = "") {
  const preview = document.querySelector("#selection-preview");
  if (!preview) return;
  if (message) {
    preview.textContent = message;
    return;
  }
  preview.textContent = selectedEditorText
    ? selectedEditorText.length > 240
      ? `${selectedEditorText.slice(0, 240)}...`
      : selectedEditorText
    : "아직 선택된 문장이 없습니다.";
}

function currentEditorHeading() {
  const editor = document.querySelector("#article-editor");
  if (!editor || !selectedEditorRange) return "본문 전체";
  let node = selectedEditorRange.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  const block = node?.closest?.("h1,h2,h3,p,li") || node;
  let cursor = block;
  while (cursor && cursor !== editor) {
    if (/^H[1-3]$/u.test(cursor.tagName)) return cleanBlockText(cursor.innerText);
    cursor = cursor.previousElementSibling || cursor.parentElement;
  }
  const headings = [...editor.querySelectorAll("h1,h2,h3")];
  const selectedRect = selectedEditorRange.getBoundingClientRect();
  const before = headings
    .filter((heading) => heading.getBoundingClientRect().top <= selectedRect.top)
    .pop();
  return cleanBlockText(before?.innerText || headings[0]?.innerText || "본문 전체");
}

function replaceSelectedText(replacementText) {
  if (!selectedEditorRange) throw new Error("선택된 본문 범위가 없습니다.");
  const editor = document.querySelector("#article-editor");
  if (!editor) throw new Error("본문 편집기를 찾지 못했습니다.");
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(selectedEditorRange);
  selectedEditorRange.deleteContents();
  selectedEditorRange.insertNode(document.createTextNode(replacementText));
  selection.removeAllRanges();
  selectedEditorRange = null;
  selectedEditorText = "";
  currentEditedMarkdown = readEditorMarkdown();
}

async function rewriteSelection() {
  if (!latestResult) return;
  const instructionInput = document.querySelector("#editor-rewrite-instruction");
  const instruction = instructionInput?.value.trim() || "";
  if (!selectedEditorText || !selectedEditorRange) {
    updateSelectionPreview("본문에서 수정할 문장을 먼저 드래그하세요.");
    return;
  }
  if (!instruction) {
    updateSelectionPreview("수정 지시를 먼저 입력하세요.");
    instructionInput?.focus();
    return;
  }

  const button = document.querySelector("#rewrite-selection");
  const beforeMarkdown = readEditorMarkdown();
  const heading = currentEditorHeading();
  button.disabled = true;
  button.textContent = "Claude rewrite 중";
  try {
    const result = await requestSelectionRewrite({
      contentId: latestResult.contentId,
      title: latestResult.publishing?.ownedBlog?.title || latestResult.input.primaryKeyword,
      heading,
      instruction,
      selectedText: selectedEditorText,
      beforeMarkdown,
      fullArticleMarkdown: beforeMarkdown,
      runInput: readForm()
    });
    const originalSelectedText = selectedEditorText;
    replaceSelectedText(result.replacementText);
    const afterMarkdown = readEditorMarkdown();
    await saveEditorRevision({
      contentId: latestResult.contentId,
      title: latestResult.publishing?.ownedBlog?.title || latestResult.input.primaryKeyword,
      heading,
      action: "claude-rewrite",
      instruction,
      selectedText: originalSelectedText,
      replacementText: result.replacementText,
      summary: result.summary,
      model: result.model,
      mode: result.mode,
      beforeMarkdown,
      afterMarkdown,
      runInput: readForm()
    });
    lastSavedEditorMarkdown = afterMarkdown;
    updateSelectionPreview("선택 문장을 교체하고 편집 기록에 저장했습니다.");
    await refreshRevisionHistory();
    await refreshHistory();
  } finally {
    button.disabled = false;
    button.textContent = "선택 문장 Claude rewrite";
  }
}

async function saveManualEditorRevision() {
  if (!latestResult) return;
  const afterMarkdown = readEditorMarkdown();
  if (!afterMarkdown) return;
  const beforeMarkdown = lastSavedEditorMarkdown || currentEditedMarkdown || afterMarkdown;
  const instruction =
    document.querySelector("#editor-rewrite-instruction")?.value.trim() || "본문 편집기에서 직접 수정한 내용을 저장";
  const heading = currentEditorHeading();
  const button = document.querySelector("#save-manual-revision");
  button.disabled = true;
  button.textContent = "저장 중";
  try {
    await saveEditorRevision({
      contentId: latestResult.contentId,
      title: latestResult.publishing?.ownedBlog?.title || latestResult.input.primaryKeyword,
      heading,
      action: "manual-edit",
      instruction,
      beforeMarkdown,
      afterMarkdown,
      runInput: readForm()
    });
    currentEditedMarkdown = afterMarkdown;
    lastSavedEditorMarkdown = afterMarkdown;
    updateSelectionPreview("현재 편집본을 로컬 기록에 저장했습니다.");
    await refreshRevisionHistory();
    await refreshHistory();
  } finally {
    button.disabled = false;
    button.textContent = "현재 편집본 저장";
  }
}

async function requestSelectionRewrite(input) {
  const response = await fetch("/api/editor/rewrite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Rewrite failed: ${response.status}`);
  return payload;
}

async function saveEditorRevision(input) {
  const response = await fetch("/api/editor/revision/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Revision save failed: ${response.status}`);
  return payload;
}

async function fetchRevisions() {
  const contentId = latestResult?.contentId ? `?contentId=${encodeURIComponent(latestResult.contentId)}` : "";
  const response = await fetch(`/api/editor/revision/list${contentId}`);
  if (!response.ok) return [];
  const { revisions = [] } = await response.json();
  return revisions;
}

async function refreshRevisionHistory() {
  const container = document.querySelector("#revision-tree");
  if (!container || !latestResult) return;
  const revisions = await fetchRevisions();
  renderRevisionTree(revisions);
}

function renderRevisionTree(revisions = []) {
  const container = document.querySelector("#revision-tree");
  if (!container) return;
  if (!revisions.length) {
    container.innerHTML = "<p>아직 저장된 편집 기록이 없습니다.</p>";
    return;
  }
  const groups = revisions.reduce((map, item) => {
    const key = item.heading || "본문 전체";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  container.innerHTML = [...groups.entries()]
    .map(
      ([heading, items]) => `
        <details class="revision-folder" open>
          <summary>${escapeHtml(heading)} <span>${items.length}</span></summary>
          <div class="revision-items">
            ${items
              .map(
                (item) => `
                  <button
                    type="button"
                    class="revision-item"
                    data-revision-content-id="${escapeHtml(item.contentId)}"
                    data-revision-id="${escapeHtml(item.id)}"
                  >
                    <strong>${escapeHtml(item.summary || item.action)}</strong>
                    <span>${escapeHtml(formatKst(item.createdAt))} KST</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </details>
      `
    )
    .join("");
}

async function readRevision(contentId, id) {
  const response = await fetch("/api/editor/revision/read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentId, id })
  });
  if (!response.ok) throw new Error(`Revision read failed: ${response.status}`);
  const { revision } = await response.json();
  return revision;
}

function renderRevisionDetail(revision) {
  latestRevisionDetail = revision;
  const detail = document.querySelector("#revision-detail");
  if (!detail) return;
  detail.innerHTML = `
    <div class="revision-detail-box">
      <div class="kicker">${escapeHtml(revision.action || "revision")}</div>
      <h3>${escapeHtml(revision.summary || revision.title || "편집 기록")}</h3>
      <p>${escapeHtml(revision.heading || "본문 전체")} · ${escapeHtml(formatKst(revision.createdAt))} KST</p>
      ${revision.instruction ? `<p><strong>지시</strong> ${escapeHtml(revision.instruction)}</p>` : ""}
      ${revision.selectedText ? `<p><strong>선택 원문</strong> ${escapeHtml(revision.selectedText)}</p>` : ""}
      ${revision.replacementText ? `<p><strong>변경 문장</strong> ${escapeHtml(revision.replacementText)}</p>` : ""}
      <button type="button" id="load-revision-snapshot">이 편집본 불러오기</button>
      <p><code>${escapeHtml(revision.path || "")}</code></p>
    </div>
  `;
}

async function createOutline(input) {
  const response = await fetch("/api/outline", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.details?.message || payload.error || `API failed: ${response.status}`);
  }
  return response.json();
}

async function requestOutline(extraInput = {}) {
  const input = { ...readForm(), ...extraInput };
  const result = await createOutline(input);
  outlineApproved = false;
  latestClaudeRun = null;
  currentEditedMarkdown = "";
  lastSavedEditorMarkdown = "";
  selectedEditorRange = null;
  selectedEditorText = "";
  latestRevisionDetail = null;
  render(result);
  renderPreview();
  renderPackage();
  switchTab("outline");
  return result;
}

function readForm() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.referenceUrls = String(data.referenceUrls || "")
    .split(/\s+/)
    .map((url) => url.trim())
    .filter(Boolean);
  return data;
}

async function enhanceFormField(fieldName, button) {
  const field = form.elements[fieldName];
  if (!field) return;

  const originalText = button.textContent.trim() || "✦";
  const originalTitle = button.title;
  button.disabled = true;
  button.textContent = "...";
  button.title = "전체 문맥으로 개선 중";

  try {
    const response = await fetch("/api/input/enhance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fieldName,
        input: readForm()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.value) {
      throw new Error(payload.error || payload.details?.message || `Input enhance failed: ${response.status}`);
    }
    field.value = payload.value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    button.title = payload.mode === "live" ? "Claude API로 개선 완료" : "로컬 규칙으로 개선 완료";
  } catch (error) {
    outlineOutput.innerHTML =
      card(
        "입력 개선 실패",
        `<p>${escapeHtml(error.message)}</p>
         <p>Anthropic API 키, 모델명, 네트워크 상태를 확인하세요.</p>`,
        "error"
      ) + outlineOutput.innerHTML;
    switchTab("outline");
    button.title = originalTitle;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function render(result) {
  latestResult = result;
  renderOutline(result);
  renderStructure(result);
  renderBody(result);
  renderPreview();
  renderPackage();
  renderImages(result);
  renderTracking(result);
  refreshPerformanceHistory();
  refreshHistory();
}

async function recordPerformance(input) {
  const response = await fetch("/api/performance/record", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(`Performance record failed: ${response.status}`);
  return response.json();
}

async function fetchPerformanceHistory() {
  const query = latestResult?.contentId ? `?contentId=${encodeURIComponent(latestResult.contentId)}` : "";
  const response = await fetch(`/api/performance/list${query}`);
  if (!response.ok) return [];
  const { snapshots = [] } = await response.json();
  return snapshots;
}

async function refreshPerformanceHistory(savedSnapshot = null) {
  if (!latestResult) return;
  const snapshots = await fetchPerformanceHistory();
  renderTracking(latestResult, savedSnapshot, snapshots);
}

async function createPreview(payload) {
  const response = await fetch("/api/preview/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Preview failed: ${response.status}`);
  return response.json();
}

async function createPackage(payload) {
  const response = await fetch("/api/package/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Package failed: ${response.status}`);
  return response.json();
}

async function fetchHistory() {
  const contentId = !showAllHistory && latestResult?.contentId ? latestResult.contentId : "";
  const query = contentId ? `?contentId=${encodeURIComponent(contentId)}` : "";
  const response = await fetch(`/api/history/list${query}`);
  if (!response.ok) throw new Error(`History failed: ${response.status}`);
  const { items = [] } = await response.json();
  return items;
}

async function refreshHistory() {
  if (!showAllHistory && !latestResult) {
    renderHistory([]);
    return;
  }
  renderHistory(await fetchHistory());
}

async function readHistoryItem(type, id) {
  const response = await fetch("/api/history/read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, id })
  });
  if (!response.ok) throw new Error(`History read failed: ${response.status}`);
  const { item } = await response.json();
  return item;
}

async function runAdapters(input, adapterId = "") {
  const response = await fetch("/api/integrations/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(adapterId ? { runInput: input, adapterId } : { runInput: input })
  });
  if (!response.ok) throw new Error(`Adapters failed: ${response.status}`);
  return response.json();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
  });
});

document.addEventListener("selectionchange", captureEditorSelection);

magicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    enhanceFormField(button.dataset.enhanceField, button);
  });
});

bodyOutput.addEventListener("input", (event) => {
  if (!event.target.closest("#article-editor")) return;
  currentEditedMarkdown = readEditorMarkdown();
  renderPreview();
  renderPackage();
});

bodyOutput.addEventListener("click", async (event) => {
  const rewriteButton = event.target.closest("#rewrite-selection");
  const saveButton = event.target.closest("#save-manual-revision");
  const revisionButton = event.target.closest("[data-revision-content-id][data-revision-id]");
  const loadButton = event.target.closest("#load-revision-snapshot");
  try {
    if (rewriteButton) {
      await rewriteSelection();
      return;
    }
    if (saveButton) {
      await saveManualEditorRevision();
      return;
    }
    if (revisionButton) {
      const revision = await readRevision(revisionButton.dataset.revisionContentId, revisionButton.dataset.revisionId);
      renderRevisionDetail(revision);
      return;
    }
    if (loadButton && latestRevisionDetail?.afterMarkdown) {
      const editor = document.querySelector("#article-editor");
      if (!editor) return;
      editor.innerHTML = markdownToHtml(latestRevisionDetail.afterMarkdown);
      currentEditedMarkdown = cleanGeneratedMarkdown(latestRevisionDetail.afterMarkdown);
      lastSavedEditorMarkdown = currentEditedMarkdown;
      renderPreview();
      renderPackage();
      updateSelectionPreview("선택한 편집본을 본문 편집기에 불러왔습니다.");
    }
  } catch (error) {
    updateSelectionPreview(error.message);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "목차 생성 중";
  try {
    await requestOutline();
  } catch (error) {
    outlineOutput.innerHTML = card(
      "Claude 목차 생성 실패",
      `<p>${escapeHtml(error.message)}</p>
       <p>Anthropic API 키, 모델명, 네트워크 상태를 확인하세요. 로컬 fallback으로 조용히 넘어가지 않습니다.</p>`,
      "error"
    );
    switchTab("outline");
  } finally {
    submit.disabled = false;
    submit.textContent = "시작하기";
  }
});

rewriteOutlineButton.addEventListener("click", async () => {
  if (!latestResult) return;
  rewriteOutlineButton.disabled = true;
  rewriteOutlineButton.textContent = "목차 다시 쓰는 중";
  try {
    const instruction = outlineRevisionInput.value.trim();
    await requestOutline({
      outlineRevisionInstruction:
        instruction ||
        "현재 목차가 충분히 날카롭지 않습니다. 검색 의도에 더 맞게 H1/H2 흐름을 다시 잡고, 이미지 위치도 다시 배치하세요.",
      previousOutline: {
        h1: latestResult.architecture.h1,
        sections: latestResult.architecture.sections.map((section) => ({
          h2: section.h2,
          userQuestion: section.userQuestion,
          imageNeed: section.imageNeed
        }))
      }
    });
  } catch (error) {
    outlineOutput.innerHTML =
      card(
        "Claude 목차 재작성 실패",
        `<p>${escapeHtml(error.message)}</p>
         <p>지시문을 조금 더 구체화하거나 API 상태를 확인하세요.</p>`,
        "error"
      ) + outlineOutput.innerHTML;
  } finally {
    rewriteOutlineButton.disabled = false;
    rewriteOutlineButton.textContent = "목차 다시 쓰기";
  }
});

approveOutlineButton.addEventListener("click", () => {
  if (!latestResult) return;
  outlineApproved = true;
  renderOutline(latestResult);
  renderStructure(latestResult);
  renderBody(latestResult);
  renderPreview();
  renderPackage();
  switchTab("structure");
});

runClaudeButton.addEventListener("click", async () => {
  if (!latestResult) return;
  runClaudeButton.disabled = true;
  runClaudeButton.textContent = "Claude 생성 중";
  try {
    latestClaudeRun = await runAdapters(readForm(), "claude-writing");
    currentEditedMarkdown = cleanGeneratedMarkdown(extractClaudeText(latestClaudeRun));
    lastSavedEditorMarkdown = currentEditedMarkdown;
    selectedEditorRange = null;
    selectedEditorText = "";
    latestRevisionDetail = null;
    renderBody(latestResult);
    renderPreview();
    renderPackage();
    await refreshHistory();
    switchTab("body");
  } finally {
    runClaudeButton.disabled = false;
    runClaudeButton.textContent = "Claude로 본문 생성";
  }
});

performanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!latestResult) return;
  const submit = performanceForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "성과 저장 중";
  try {
    const metrics = Object.fromEntries(new FormData(performanceForm).entries());
    const missing = ["impressions", "clicks", "avgPosition", "sessions", "ctaClicks", "leads"].filter(
      (field) => String(metrics[field] || "").trim() === ""
    );
    if (missing.length) {
      trackingOutput.innerHTML =
        card(
          "성과 저장 보류",
          `<p>실제 측정값이 비어 있습니다. Search Console, GA4, GTM에서 확인한 숫자를 입력한 뒤 저장하세요.</p>
           <p>비어 있는 필드: ${missing.map(escapeHtml).join(", ")}</p>`,
          "needs real data"
        ) + trackingOutput.innerHTML;
      return;
    }
    const { snapshot } = await recordPerformance({
      contentId: latestResult.contentId,
      runInput: readForm(),
      metrics,
      source: "manual-ui"
    });
    latestResult.performanceSimulation = snapshot.simulation;
    await refreshPerformanceHistory(snapshot);
    await refreshHistory();
  } finally {
    submit.disabled = false;
    submit.textContent = "성과 루프 계산/저장";
  }
});

refreshHistoryButton.addEventListener("click", async () => {
  refreshHistoryButton.disabled = true;
  refreshHistoryButton.textContent = "기록 불러오는 중";
  try {
    await refreshHistory();
  } finally {
    refreshHistoryButton.disabled = false;
    refreshHistoryButton.textContent = "현재 콘텐츠 기록 새로고침";
  }
});

toggleHistoryScopeButton.addEventListener("click", async () => {
  showAllHistory = !showAllHistory;
  await refreshHistory();
});

historyOutput.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-history-type][data-history-id]");
  if (!button) return;
  const type = button.dataset.historyType;
  const id = button.dataset.historyId;
  const detail = historyOutput.querySelector(`[data-history-detail="${cssEscape(`${type}:${id}`)}"]`);
  if (!detail) return;
  button.disabled = true;
  button.textContent = "불러오는 중";
  try {
    const item = await readHistoryItem(type, id);
    const detailText =
      typeof item.payload === "string" ? item.payload : JSON.stringify(item.payload, null, 2);
    detail.innerHTML = `<pre>${escapeHtml(detailText)}</pre>`;
  } finally {
    button.disabled = false;
    button.textContent = "상세 보기";
  }
});

createPreviewButton.addEventListener("click", async () => {
  createPreviewButton.disabled = true;
  createPreviewButton.textContent = "프리뷰 생성 중";
  try {
    renderPreview(await createPreview(buildExportPayload()));
    await refreshHistory();
  } finally {
    createPreviewButton.disabled = false;
    createPreviewButton.textContent = "HTML 미리보기 생성";
  }
});

createPackageButton.addEventListener("click", async () => {
  createPackageButton.disabled = true;
  createPackageButton.textContent = "패키지 생성 중";
  try {
    renderPackage(await createPackage(buildExportPayload()));
    await refreshHistory();
  } finally {
    createPackageButton.disabled = false;
    createPackageButton.textContent = "파일 내보내기";
  }
});

await initialize();
