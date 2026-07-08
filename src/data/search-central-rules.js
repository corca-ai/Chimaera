export const searchCentralRules = [
  {
    id: "helpful-content",
    label: "Helpful Content",
    check:
      "Does the article solve the searcher's real problem with original, complete, and trustworthy information?",
    source: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"
  },
  {
    id: "spam-policy",
    label: "Spam Policy",
    check:
      "Avoid scaled low-value content, keyword stuffing, hidden text, doorway pages, and manipulative automation.",
    source: "https://developers.google.com/search/docs/essentials/spam-policies"
  },
  {
    id: "canonical",
    label: "Canonical",
    check:
      "Every owned-blog article must declare a canonical URL and must not reuse the same text across channels.",
    source: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls"
  },
  {
    id: "structured-data",
    label: "Structured Data",
    check:
      "Use JSON-LD schema that matches visible content, usually Article or BlogPosting, BreadcrumbList, and FAQPage when real FAQ exists.",
    source: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
  },
  {
    id: "image-seo",
    label: "Image SEO",
    check:
      "Use descriptive filenames, meaningful ALT, stable dimensions, and images that clarify the section rather than decorate it.",
    source: "https://developers.google.com/search/docs/appearance/google-images"
  },
  {
    id: "page-experience",
    label: "Page Experience",
    check:
      "Keep the page mobile readable, fast, stable, and free of intrusive interstitials.",
    source: "https://developers.google.com/search/docs/appearance/page-experience"
  },
  {
    id: "ymyl-review",
    label: "YMYL Review",
    check:
      "Medical, legal, and financial content must expose author expertise, evidence, limitations, and professional review status.",
    source: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"
  }
];

export function buildSeoGateReport({ category = "", channel = "owned-blog", hasFaq = true }) {
  const lower = category.toLowerCase();
  const isYMYL =
    lower.includes("medical") ||
    lower.includes("의료") ||
    lower.includes("legal") ||
    lower.includes("법률") ||
    lower.includes("finance") ||
    lower.includes("경제");

  return searchCentralRules.map((rule) => {
    let required = true;
    if (rule.id === "ymyl-review") required = isYMYL;
    if (rule.id === "canonical") required = channel === "owned-blog";
    if (rule.id === "structured-data" && !hasFaq) required = true;
    return {
      ...rule,
      required,
      status: required ? "required" : "recommended"
    };
  });
}
