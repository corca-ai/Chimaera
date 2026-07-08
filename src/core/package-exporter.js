import { buildNaverDerivative } from "./naver-derivative.js";
import { renderPreviewHtml } from "./article-renderer.js";

export function buildPublishPackage(run, options = {}) {
  const modelArtifacts = options.modelArtifacts || buildPlannedModelArtifacts(run);
  const naverDerivative = buildNaverDerivative(run);
  return {
    contentId: run.contentId,
    generatedAt: new Date().toISOString(),
    manifest: {
      contentId: run.contentId,
      title: run.publishing.ownedBlog.title,
      primaryKeyword: run.input.primaryKeyword,
      category: run.input.category,
      channel: run.input.channel,
      template: run.selectedTemplate.id,
      qualityScore: run.qualityReport.score,
      schemaScore: run.schemaValidation.score,
      packageFiles: [
        "manifest.json",
        "owned-article.md",
        "owned-preview.html",
        "wordpress-payload.json",
        "nextjs-props.json",
        "json-ld.json",
        "gtm-events.json",
        "image-briefs.json",
        "html-structure.json",
        "model-artifacts.json",
        "naver-derivative.json",
        "review-checklist.md"
      ]
    },
    files: {
      "manifest.json": null,
      "owned-article.md": run.publishing.ownedBlog.bodyMarkdown,
      "owned-preview.html": renderPreviewHtml(run),
      "wordpress-payload.json": {
        title: run.publishing.ownedBlog.title,
        slug: run.publishing.ownedBlog.slug,
        status: "draft",
        content: run.publishing.ownedBlog.bodyMarkdown,
        meta: {
          content_id: run.contentId,
          seo_loop_template: run.selectedTemplate.id,
          primary_keyword: run.input.primaryKeyword
        }
      },
      "nextjs-props.json": {
        contentId: run.contentId,
        seo: {
          title: run.publishing.ownedBlog.metaTitle,
          description: run.publishing.ownedBlog.metaDescription,
          canonicalPath: run.publishing.ownedBlog.canonicalPath,
          jsonLd: run.publishing.ownedBlog.jsonLd
        },
        article: {
          title: run.publishing.ownedBlog.title,
          markdown: run.publishing.ownedBlog.bodyMarkdown,
          images: run.imageBriefs,
          modelArtifacts,
          cta: run.conversion
        },
        tracking: run.measurement
      },
      "json-ld.json": run.publishing.ownedBlog.jsonLd,
      "gtm-events.json": {
        pageView: run.measurement.dataLayerOnPageView,
        leadSubmit: run.conversion.dataLayerEvent
      },
      "image-briefs.json": run.imageBriefs,
      "html-structure.json": {
        tableOfContents: run.architecture.tableOfContents,
        htmlStructure: run.architecture.htmlStructure
      },
      "model-artifacts.json": modelArtifacts,
      "naver-derivative.json": naverDerivative,
      "review-checklist.md": buildReviewChecklist(run, naverDerivative)
    }
  };
}

function buildPlannedModelArtifacts(run) {
  return {
    status: "planned",
    contentId: run.contentId,
    note: "Live Claude/GPT image outputs are attached here after an integration run creates model artifacts.",
    expected: [
      {
        adapterId: "claude-writing",
        output: "claude-draft.md",
        purpose: "Humanized Korean article draft"
      },
      {
        adapterId: "gpt-image",
        output: "gpt-image-prompts.json or generated image files",
        purpose: "SEO image assets with ALT text and filenames"
      },
      {
        adapterId: "wordpress-headless",
        output: "wordpress-draft.json",
        purpose: "Draft post metadata and URL"
      }
    ]
  };
}

function buildReviewChecklist(run, naverDerivative) {
  const quality = run.qualityReport.checks
    .map((check) => `- [${check.passed ? "x" : " "}] ${check.label}`)
    .join("\n");
  const schema = run.schemaValidation.checks
    .map((check) => `- [${check.passed ? "x" : " "}] ${check.label}`)
    .join("\n");
  const naver = naverDerivative.mustAvoid.map((item) => `- [ ] ${item}`).join("\n");

  return `# Review Checklist

## Owned Blog Quality

${quality}

## Structured Data

${schema}

## Naver Duplicate-Content Safety

${naver}

## Manual Review

- [ ] 의료/법률/금융 YMYL 문구 검토
- [ ] 출처와 최신성 검토
- [ ] 이미지 ALT와 파일명 검토
- [ ] CTA가 과장 없이 자연스러운지 검토
- [ ] GTM/GA4 이벤트명이 실제 컨테이너와 맞는지 검토
`;
}
