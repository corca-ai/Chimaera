import { cleanGeneratedMarkdown } from "./humanization.js";

export function renderPreviewHtml(run) {
  const article = run.publishing.ownedBlog;
  const htmlBody = markdownToHtml(article.bodyMarkdown, run.imageBriefs, run.architecture.sections);
  const toc = buildToc(run);
  const jsonLd = JSON.stringify(article.jsonLd, null, 2);
  const dataLayer = JSON.stringify(run.measurement.dataLayerOnPageView, null, 2);
  const leadEvent = JSON.stringify(run.conversion.dataLayerEvent, null, 2);
  const related = buildRelatedPosts(run);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(article.metaTitle)}</title>
    <meta name="description" content="${escapeHtml(article.metaDescription)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(article.canonicalPath)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(article.metaTitle)}" />
    <meta property="og:description" content="${escapeHtml(article.metaDescription)}" />
    <script type="application/ld+json">${escapeScript(jsonLd)}</script>
    <script>
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(${escapeScript(dataLayer)});
    </script>
    <style>${previewCss()}</style>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="#">${escapeHtml(run.input.brandName)}</a>
      <span>${escapeHtml(run.input.category)} · ${escapeHtml(run.selectedTemplate.name)}</span>
    </header>
    <main>
      <article class="article">
        <p class="eyebrow">SEO Preview · ${escapeHtml(run.contentId)}</p>
        ${toc}
        ${htmlBody}
      </article>
      <aside class="cta">
        <h2>${escapeHtml(run.conversion.headline)}</h2>
        <p>${escapeHtml(run.conversion.body)}</p>
        <form onsubmit="window.dataLayer.push(${escapeScript(leadEvent)}); return false;">
          <label>성함 <input name="name" placeholder="홍길동" /></label>
          <label>연락처 <input name="phone" placeholder="010-0000-0000" /></label>
          <label>관심 내용 <input name="interest" value="${escapeHtml(
            run.input.primaryKeyword
          )}" /></label>
          <label class="check"><input type="checkbox" required /> 개인정보 수집에 동의합니다</label>
          <button>${escapeHtml(run.conversion.buttonLabel)}</button>
        </form>
      </aside>
      <section class="related">
        <h2>최신 글 더보기</h2>
        <div class="related-grid">${related}</div>
      </section>
    </main>
  </body>
</html>`;
}

function markdownToHtml(markdown, imageBriefs, sections = []) {
  const lines = cleanGeneratedMarkdown(markdown).split("\n");
  const imagesByHeading = new Map(imageBriefs.map((image) => [image.placementAfterH2, image]));
  const sectionByHeading = new Map(sections.map((section) => [section.h2, section.id]));
  return lines
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) {
        const rawHeading = line.slice(3);
        const heading = escapeHtml(rawHeading);
        const sectionId = sectionByHeading.get(rawHeading);
        const image = imagesByHeading.get(rawHeading);
        return `<h2${sectionId ? ` id="${escapeHtml(sectionId)}"` : ""}>${heading}</h2>${
          image ? imagePlaceholder(image) : ""
        }`;
      }
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

function buildToc(run) {
  const items = run.architecture.sections
    .map(
      (section) =>
        `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.h2)}</a><span>${escapeHtml(
          section.imageNeed === "none" ? "이미지 없음" : `이미지: ${section.imageNeed}`
        )}</span></li>`
    )
    .join("");
  return `<nav class="toc" aria-label="목차"><h2>목차</h2><ol>${items}</ol></nav>`;
}

function imagePlaceholder(image) {
  return `<figure class="image-card">
    <div class="image-box">${escapeHtml(image.type)}</div>
    <figcaption>${escapeHtml(image.alt)} · ${escapeHtml(image.filename)}</figcaption>
  </figure>`;
}

function buildRelatedPosts(run) {
  const candidates = run.keywordResearch.candidates.slice(0, 3);
  return candidates
    .map(
      (candidate) => `<article class="related-card">
        <p>${escapeHtml(candidate.intent)}</p>
        <h3>${escapeHtml(candidate.keyword)}</h3>
        <span>${escapeHtml(candidate.templateName)}</span>
      </article>`
    )
    .join("");
}

function previewCss() {
  return `
    body { margin: 0; background: #f5f7f6; color: #17201d; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .site-header { display: flex; justify-content: space-between; gap: 16px; padding: 18px 28px; border-bottom: 1px solid #d9e0dd; background: #fff; color: #66736f; }
    .brand { color: #0d7f68; font-weight: 900; text-decoration: none; }
    main { width: min(980px, calc(100% - 32px)); margin: 32px auto 72px; }
    .article, .cta, .related { border: 1px solid #d9e0dd; border-radius: 8px; background: #fff; padding: 28px; box-shadow: 0 18px 45px rgba(23, 32, 29, 0.08); }
    .article h1 { max-width: 840px; margin: 0 0 20px; font-size: clamp(32px, 5vw, 54px); line-height: 1.08; letter-spacing: 0; }
    .article h2 { margin: 34px 0 12px; padding-top: 20px; border-top: 1px solid #d9e0dd; font-size: 25px; letter-spacing: 0; }
    .article p { max-width: 760px; color: #2c3834; font-size: 18px; line-height: 1.85; }
    .toc { margin: 22px 0 28px; padding: 18px; border: 1px solid #d9e0dd; border-radius: 8px; background: #f8fbfa; }
    .toc h2 { margin: 0 0 12px; padding: 0; border: 0; font-size: 18px; }
    .toc ol { display: grid; gap: 10px; margin: 0; padding-left: 20px; }
    .toc li span { display: block; margin-top: 2px; color: #66736f; font-size: 13px; }
    .toc a { color: #0a5f4e; font-weight: 800; text-decoration: none; }
    .eyebrow { color: #0d7f68 !important; font-size: 13px !important; font-weight: 900; text-transform: uppercase; }
    .image-card { margin: 14px 0 20px; }
    .image-box { display: grid; min-height: 260px; place-items: center; border-radius: 8px; background: linear-gradient(135deg, rgba(13, 127, 104, 0.14), rgba(40, 91, 145, 0.14)); color: #0a5f4e; font-weight: 900; }
    figcaption { margin-top: 8px; color: #66736f; font-size: 14px; }
    .cta { margin-top: 22px; background: #10201b; color: #fff; }
    .cta p { color: #d8ebe5; line-height: 1.7; }
    .cta form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .cta label { display: grid; gap: 6px; color: #d8ebe5; font-size: 14px; font-weight: 700; }
    .cta input { min-height: 42px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 10px; }
    .cta .check { grid-column: 1 / -1; display: flex; align-items: center; }
    .cta button { min-height: 46px; border: 0; border-radius: 8px; background: #0d7f68; color: #fff; font-weight: 900; cursor: pointer; }
    .related { margin-top: 22px; }
    .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .related-card { min-height: 150px; padding: 16px; border: 1px solid #d9e0dd; border-radius: 8px; background: #f8fbfa; }
    .related-card p { margin: 0 0 8px; color: #0d7f68; font-size: 12px; font-weight: 900; }
    .related-card h3 { margin: 0 0 12px; font-size: 18px; }
    .related-card span { color: #66736f; }
    @media (max-width: 760px) { .cta form, .related-grid { grid-template-columns: 1fr; } .article, .cta, .related { padding: 20px; } }
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeScript(value) {
  return String(value).replaceAll("</script", "<\\/script");
}
