export const agentNodes = [
  {
    id: "category-selector",
    name: "Category Selector",
    layer: "input",
    responsibility:
      "Collect channel, category, audience, brand, product, keyword, and lead goal.",
    output: "content_request"
  },
  {
    id: "keyword-intent",
    name: "Keyword Intent Agent",
    layer: "research",
    responsibility:
      "Classify search intent, expand keyword clusters, and mark live-volume data that needs an external source.",
    output: "keyword_brief"
  },
  {
    id: "benchmark-reader",
    name: "Benchmark Reader Agent",
    layer: "benchmark",
    responsibility:
      "Read reference URLs beyond text: title, meta, H tags, schema, ALT, images, CTA, forms, and related posts.",
    output: "benchmark_patterns"
  },
  {
    id: "google-search-grounding",
    name: "Google Search Grounding Agent",
    layer: "grounding",
    responsibility:
      "Apply Google Search Central rules for helpful content, spam risk, structured data, canonical, sitemap, and image SEO.",
    output: "seo_quality_gates"
  },
  {
    id: "template-selector",
    name: "Template Selector Agent",
    layer: "planning",
    responsibility:
      "Choose the best article template for the search intent instead of forcing one layout.",
    output: "article_template"
  },
  {
    id: "copy-architect",
    name: "Copy Architect Agent",
    layer: "writing",
    responsibility:
      "Design H1/H2/H3 flow, conclusion-first answer, evidence slots, trust blocks, and CTA rhythm.",
    output: "content_architecture"
  },
  {
    id: "claude-writing",
    name: "Claude Writing Agent",
    layer: "generation",
    responsibility:
      "Generate the long-form Korean draft. In this local build, a deterministic fallback writer is used.",
    output: "draft_article"
  },
  {
    id: "humanization",
    name: "Humanization Agent",
    layer: "quality",
    responsibility:
      "Apply im-not-ai style rules: remove translationese, stiff AI phrasing, over-summary, and mechanical rhythm.",
    output: "humanized_article"
  },
  {
    id: "visual-seo",
    name: "Visual SEO Agent",
    layer: "visual",
    responsibility:
      "Plan GPT image prompts, section placement, ALT, filenames, and image dimensions.",
    output: "image_briefs"
  },
  {
    id: "conversion",
    name: "Conversion Agent",
    layer: "conversion",
    responsibility:
      "Connect the reader problem to the brand/product and create a lead-form CTA block.",
    output: "cta_block"
  },
  {
    id: "publishing",
    name: "Publishing Agent",
    layer: "publishing",
    responsibility:
      "Create WordPress/Next.js payloads and Naver support-channel derivative instructions.",
    output: "publish_payload"
  },
  {
    id: "tracking",
    name: "Tracking Agent",
    layer: "measurement",
    responsibility:
      "Emit content_id, dataLayer, GA4 key event map, GSC URL checks, and daily performance schema.",
    output: "measurement_plan"
  },
  {
    id: "performance-loop",
    name: "Performance Loop Agent",
    layer: "learning",
    responsibility:
      "Use impressions, clicks, CTR, sessions, and leads to strengthen or weaken templates, keywords, CTA, and image patterns.",
    output: "next_strategy"
  }
];

export const agentEdges = [
  ["category-selector", "keyword-intent"],
  ["keyword-intent", "benchmark-reader"],
  ["keyword-intent", "google-search-grounding"],
  ["benchmark-reader", "template-selector"],
  ["google-search-grounding", "template-selector"],
  ["template-selector", "copy-architect"],
  ["copy-architect", "claude-writing"],
  ["claude-writing", "humanization"],
  ["humanization", "visual-seo"],
  ["visual-seo", "conversion"],
  ["conversion", "publishing"],
  ["publishing", "tracking"],
  ["tracking", "performance-loop"],
  ["performance-loop", "keyword-intent"]
];

export const dataTables = [
  {
    name: "content_runs",
    purpose: "One generated article loop.",
    fields: [
      "content_id",
      "channel",
      "category",
      "primary_keyword",
      "template_id",
      "status"
    ]
  },
  {
    name: "keyword_research",
    purpose: "Keyword and trend evidence.",
    fields: [
      "content_id",
      "keyword",
      "intent",
      "volume_band",
      "trend_score",
      "source_url",
      "last_verified_at"
    ]
  },
  {
    name: "benchmark_pages",
    purpose: "Reference-page SEO structure.",
    fields: [
      "url",
      "title",
      "h1",
      "h2_count",
      "schema_types",
      "image_alt_score",
      "cta_type"
    ]
  },
  {
    name: "article_versions",
    purpose: "Draft, humanized, and final article versions.",
    fields: [
      "content_id",
      "version",
      "engine",
      "body_markdown",
      "quality_score"
    ]
  },
  {
    name: "image_assets",
    purpose: "Generated or planned image assets.",
    fields: [
      "content_id",
      "section_id",
      "prompt",
      "alt",
      "filename",
      "status"
    ]
  },
  {
    name: "conversion_events",
    purpose: "GTM/GA4 lead events.",
    fields: ["content_id", "event_name", "cta_id", "lead_type", "form_id"]
  },
  {
    name: "performance_daily",
    purpose: "GSC/GA4/GTM performance snapshot.",
    fields: [
      "content_id",
      "date",
      "impressions",
      "clicks",
      "ctr",
      "avg_position",
      "sessions",
      "leads"
    ]
  },
  {
    name: "learning_rules",
    purpose: "Reinforcement and weakening decisions.",
    fields: ["rule_id", "signal", "action", "weight_delta", "last_evidence_at"]
  }
];
