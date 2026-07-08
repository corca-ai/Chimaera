export function validateStructuredData(run) {
  const jsonLd = run.publishing?.ownedBlog?.jsonLd;
  const graph = jsonLd?.["@graph"];
  const checks = [
    {
      id: "context",
      label: "JSON-LD has schema.org context",
      passed: jsonLd?.["@context"] === "https://schema.org"
    },
    {
      id: "graph",
      label: "JSON-LD has @graph array",
      passed: Array.isArray(graph) && graph.length >= 2
    },
    {
      id: "article",
      label: "BlogPosting or Article node exists",
      passed: hasType(graph, ["BlogPosting", "Article"])
    },
    {
      id: "headline",
      label: "Article headline matches visible H1",
      passed: graphHas(graph, ["BlogPosting", "Article"], "headline", run.architecture.h1)
    },
    {
      id: "breadcrumb",
      label: "BreadcrumbList node exists",
      passed: hasType(graph, ["BreadcrumbList"])
    },
    {
      id: "faq",
      label: "FAQPage exists when template expects FAQ",
      passed:
        !run.architecture.schemaTargets.includes("FAQPage") || hasType(graph, ["FAQPage"])
    },
    {
      id: "images",
      label: "Article node includes image URLs",
      passed: articleImages(graph).length >= Math.min(run.imageBriefs.length, 1)
    },
    {
      id: "content-id",
      label: "content_id is present",
      passed: jsonLd?.content_id === run.contentId
    }
  ];

  return {
    score: Math.round(
      (checks.filter((check) => check.passed).length / checks.length) * 100
    ),
    status: checks.every((check) => check.passed) ? "valid" : "needs-review",
    checks
  };
}

function hasType(graph = [], types = []) {
  return graph.some((node) => types.includes(node?.["@type"]));
}

function graphHas(graph = [], types = [], key, value) {
  return graph.some((node) => types.includes(node?.["@type"]) && node?.[key] === value);
}

function articleImages(graph = []) {
  const article = graph.find((node) => ["BlogPosting", "Article"].includes(node?.["@type"]));
  return Array.isArray(article?.image) ? article.image : [];
}
