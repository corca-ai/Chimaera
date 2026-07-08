# Chimaera: SEO Loop Harness

Chimaera is a Korean SEO blog content loop system for owned-blog-first content
operations. It helps operators move from search intent and outline approval to
humanized Korean drafts, HTML preview/export, performance measurement, and local
revision history.

This first build is a local, dependency-free harness that turns a category,
keyword, brand/product context, and conversion goal into:

- outline-first approval before showing the full article body
- H1/H2/H3 article architecture
- image placement plan per section
- HTML export structure with TOC, JSON-LD, GTM events, CTA, and related posts
- Claude-generated Korean draft sections after outline approval
- im-not-ai inspired Korean humanization audit with S1/S2/S3 AI-tell detection
- visual/image briefs with ALT text and filenames
- CTA and lead-form event schema
- Google Search Central oriented quality gates
- GSC/GA4/GTM performance-loop schema
- performance reinforcement/weakening simulation
- saved performance snapshots for GSC/GA4/GTM learning loops
- saved model artifacts for Claude drafts, GPT image outputs, WordPress drafts, and tracking contracts

## Run

```bash
npm install
npm run dev
```

Then open the printed localhost URL.

On macOS, the included `SEO Loop Harness.command` launcher can start the local
server and open the browser. The generated `.app` bundle is intentionally
machine-local and is not committed.

## Local API

- `POST /api/outline`: creates and stores an outline-only planning run with TOC, image placement, and HTML export structure. It does not generate the article body.
- `POST /api/generate`: creates and stores one content loop run.
- `GET /api/runs`: lists recent stored runs.
- `POST /api/preview/create`: saves a publishable HTML preview with meta, canonical, JSON-LD, GTM dataLayer, CTA form, and related-post UI.
- `GET /api/preview/list`: lists saved previews.
- `GET /previews/:filename`: serves saved preview HTML.
- `POST /api/package/create`: exports a publish package with owned article, preview, WordPress payload, Next.js props, JSON-LD, GTM events, image briefs, Naver derivative brief, and review checklist.
- `GET /api/package/list`: lists saved publish packages.
- `GET /packages/:content_id/:filename`: serves saved package artifacts.
- `POST /api/keywords/suggest`: estimates keyword candidates, intent, template fit, and priority score.
- `POST /api/benchmark`: analyzes benchmark URLs for title/meta, H tags, schema, ALT, TOC, FAQ, and CTA signals.
- `POST /api/schedule/propose`: creates a local publishing schedule proposal.
- `POST /api/schedule/create`: saves schedule jobs to the local queue.
- `GET /api/schedule/list`: lists queued publishing jobs.
- `POST /api/schedule/dispatch`: processes due schedule jobs by creating a run, publish package, adapter execution, and updated queue status.
- `POST /api/performance/simulate`: turns GSC/GA4/GTM-like metrics into strengthen/weaken actions.
- `POST /api/performance/record`: stores a performance snapshot and its strengthen/weaken decisions.
- `GET /api/performance/list`: lists recent saved performance snapshots.
- `GET /api/integrations/status`: shows which external adapters are live-ready or dry-run.
- `POST /api/integrations/run`: executes all adapters against the current run input, using dry-run when secrets are missing, then stores the execution record.
- `GET /api/integrations/executions`: lists recent saved adapter execution records.
- `GET /api/model-artifacts`: lists normalized model/output artifacts created from adapter executions.
- `GET /model-artifacts/:content_id/:artifact_id/:filename`: serves saved artifact files.

## Current Scope

The main UI intentionally exposes only the steps that are real in this build:
`목차`, `HTML 구조`, `본문`, `이미지`, `HTML 미리보기`, `파일 내보내기`, and
`성과`.

The main UI is outline-first and does not call Claude on page load. The first
`시작하기` action calls `/api/outline`, waits for Claude, and creates only the
keyword brief, H1/H2 table of contents, image placement plan, and HTML export
structure. It does not create a local article body. The full article body is
generated only after outline approval, through the explicit Claude writing
action. The selected Anthropic model comes from the input form first, then
`ANTHROPIC_MODEL`, then the default `claude-opus-4-8`.

The left input panel includes operator-level context fields:
`writingInstruction` for the user's concrete editorial request,
`referenceUrls` for source/reference links, and `audience` for reader targeting.
These fields are passed into both the Claude outline prompt and the Claude body
prompt.

If the outline is not good enough, the article tab has a `목차 다시 쓰기`
control. The rewrite instruction is sent back to Claude together with the
previous outline, so the system iterates before article writing begins.

Keyword recommendation, benchmark crawling, integration status, run history,
and publishing queue screens are not exposed in the main UI right now. They
should return only when the underlying live workflow is ready enough to be used
as an operator-facing step.

The `기록` tab is backed by local files under `outputs/`: runs, model artifacts,
HTML previews, publish packages, and performance snapshots. The UI defaults to
the current content ID so unrelated historical test data does not leak into the
current workflow. Operators can explicitly switch to all-history mode when they
need an audit view.

Timestamps are stored as ISO UTC strings for future database migration. The UI
renders them as Korean time, `Asia/Seoul` / `UTC+09:00` / KST.

The humanization gate is informed by
[epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai). The local
implementation is a fast, inspectable gate that detects Korean AI-tell patterns
such as translationese, mechanical connectors, signature AI phrases, rhythm
uniformity, formal-noun overuse, and over-polishing risk. It is not a vendored
copy of the full strict Claude Code pipeline.

## Adapter Slots

The server reads environment variables from the shell and from a local `.env`
file in the project root. `.env` is ignored by git.

- `ANTHROPIC_API_KEY` for Claude writing
- `ANTHROPIC_MODEL` as a server-side fallback when the UI model field is empty
- `OPENAI_API_KEY` for GPT image generation
- `WORDPRESS_BASE_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APP_PASSWORD` for Headless WordPress drafts
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`, `GA4_PROPERTY_ID` for GSC and GA4 data

GTM starts with a schema-first contract: the harness emits `content_view`,
`cta_click`, and `lead_submit` event payloads before it tries to automate GTM
workspace changes.

When secrets are absent, adapters intentionally return dry-run payloads. This
keeps the loop inspectable and prevents hidden failures while credentials are
being prepared.

Every adapter run is stored under `outputs/executions`. This makes Claude/GPT
image/WordPress/GSC/GA4/GTM outcomes auditable after the browser session is
closed, and it gives the later learning loop a concrete history to compare
against performance data.

Performance snapshots are stored under `outputs/performance`. They preserve the
metrics, derived CTR/lead rates, signal verdicts, and recommended actions so
the system can reinforce or weaken keyword, template, CTA, and form patterns
over time.

Model artifacts are stored under `outputs/model-artifacts`. The artifact layer
normalizes live or dry-run outputs into files operators can reuse: Claude
Markdown drafts, GPT image prompts or image files, WordPress draft payloads, and
tracking contracts.

## Preview Output

The preview renderer is intentionally close to a publishable owned-blog page:
it includes SEO title/description, canonical, JSON-LD, page-view dataLayer,
lead-submit dataLayer, section image placeholders, CTA form, and a related-post
area. This lets the team review the article surface before WordPress or Next.js
publishing is connected.

## Publish Package

The package exporter writes a deployable handoff folder under
`outputs/packages/{content_id}`. Each folder includes:

- `owned-article.md`
- `owned-preview.html`
- `wordpress-payload.json`
- `nextjs-props.json`
- `json-ld.json`
- `gtm-events.json`
- `image-briefs.json`
- `model-artifacts.json`
- `naver-derivative.json`
- `review-checklist.md`

The Naver artifact is deliberately a derivative brief, not copied prose. It is
meant to preserve the owned blog as the measured source of truth while using
Naver as a support channel.

## Core Principle

The owned blog is the source of truth for measurement. Naver Blog is treated as
a support channel that must be strongly re-planned from the master brief, not
copied, to reduce duplicate-content risk.
