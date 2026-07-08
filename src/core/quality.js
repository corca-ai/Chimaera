export function evaluateQuality(result) {
  const checks = [
    {
      id: "h1-primary-keyword",
      label: "H1 includes primary keyword",
      passed: result.architecture.h1.includes(result.input.primaryKeyword),
      weight: 10
    },
    {
      id: "enough-h2",
      label: "Article has enough H2 sections",
      passed: result.architecture.sections.length >= 6,
      weight: 10
    },
    {
      id: "conclusion-first",
      label: "Conclusion-first opening is present",
      passed:
        result.humanized.markdown.includes("빠른 답") ||
        result.humanized.markdown.includes("결론"),
      weight: 10
    },
    {
      id: "cta-event",
      label: "Lead CTA event carries content_id",
      passed:
        result.conversion.dataLayerEvent.event === "lead_submit" &&
        result.conversion.dataLayerEvent.content_id === result.contentId,
      weight: 12
    },
    {
      id: "image-alt",
      label: "Images have ALT text and filenames",
      passed: result.imageBriefs.every((image) => image.alt && image.filename),
      weight: 10
    },
    {
      id: "json-ld",
      label: "JSON-LD graph exists",
      passed: Array.isArray(result.publishing.ownedBlog.jsonLd?.["@graph"]),
      weight: 12
    },
    {
      id: "canonical",
      label: "Owned blog canonical path exists",
      passed: Boolean(result.publishing.ownedBlog.canonicalPath),
      weight: 8
    },
    {
      id: "humanization",
      label: "im-not-ai fast gate has no S1 residue",
      passed: result.humanized.audit?.after?.severityCounts?.S1 === 0,
      weight: 10
    },
    {
      id: "over-polish",
      label: "Humanization change rate stays below over-polish threshold",
      passed: Number(result.humanized.audit?.changeRate || 0) < 0.5,
      weight: 6
    },
    {
      id: "ymyl",
      label: "YMYL category has review gates",
      passed:
        !isYMYL(result.input.category) ||
        result.seoGates.some((gate) => gate.id === "ymyl-review" && gate.required),
      weight: 10
    },
    {
      id: "naver-duplicate-policy",
      label: "Naver derivative has duplicate-content policy",
      passed: result.publishing.naverSupport.duplicateContentPolicy.includes("Do not copy"),
      weight: 8
    }
  ];

  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0);

  return {
    score: Math.round((earned / total) * 100),
    status: earned / total >= 0.85 ? "publish-ready-draft" : "needs-review",
    checks
  };
}

function isYMYL(category) {
  const lower = String(category).toLowerCase();
  return ["medical", "의료", "legal", "법률", "finance", "경제"].some((term) =>
    lower.includes(term)
  );
}
