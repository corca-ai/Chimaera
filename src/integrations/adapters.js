export const integrationAdapters = [
  {
    id: "claude-writing",
    provider: "Anthropic Claude API",
    status: "planned",
    input: ["content_architecture", "keyword_brief", "seo_quality_gates"],
    output: ["draft_article"],
    requiredSecrets: ["ANTHROPIC_API_KEY"],
    failureMode:
      "Return a structured error and keep the content run in draft-planning status."
  },
  {
    id: "gpt-image",
    provider: "OpenAI Images API",
    status: "planned",
    input: ["image_briefs"],
    output: ["image_assets"],
    requiredSecrets: ["OPENAI_API_KEY"],
    failureMode:
      "Keep image prompts and ALT/filename metadata, then allow manual image upload."
  },
  {
    id: "wordpress-headless",
    provider: "WordPress REST API",
    status: "planned",
    input: ["ownedBlog publish payload"],
    output: ["wordpress_post_id", "draft_url", "scheduled_at"],
    requiredSecrets: ["WORDPRESS_BASE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"],
    failureMode:
      "Keep a local publish payload and retry draft creation without losing content_id."
  },
  {
    id: "google-search-console",
    provider: "Search Console API",
    status: "planned",
    input: ["published_url", "content_id"],
    output: ["impressions", "clicks", "ctr", "avg_position", "index_status"],
    requiredSecrets: ["GOOGLE_SERVICE_ACCOUNT_JSON", "GSC_SITE_URL"],
    failureMode:
      "Mark live-search evidence as stale and do not make reinforcement decisions."
  },
  {
    id: "ga4-data",
    provider: "GA4 Data API",
    status: "planned",
    input: ["content_id", "landing_page_path"],
    output: ["sessions", "engagement", "cta_clicks", "lead_submits"],
    requiredSecrets: ["GOOGLE_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"],
    failureMode:
      "Keep GSC metrics separate from conversion metrics until GA4 recovers."
  },
  {
    id: "gtm-schema",
    provider: "Google Tag Manager",
    status: "schema-validated-first",
    input: ["dataLayer event contract"],
    output: ["content_view", "cta_click", "lead_submit"],
    requiredSecrets: [],
    failureMode:
      "Fail the publish quality gate if required event parameters are missing."
  }
];
