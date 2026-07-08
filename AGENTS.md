# AGENTS.md

## Project

Chimaera is a local-first Korean SEO blog operations harness. The UI is served by
`server.js` and the browser assets under `public/`. Core generation, packaging,
performance, storage, and integration logic lives under `src/`.

## Setup

Use Node.js and npm.

```bash
npm install
```

## Run

```bash
PORT=5174 npm run dev
```

Then open `http://127.0.0.1:5174/`.

## Check

Run this before handing off changes:

```bash
npm run check
```

## Safety

- Do not commit `.env`, logs, generated outputs, model artifacts, previews,
  packages, performance snapshots, or revision history.
- Treat `outputs/` as local operator data, not source code.
- Keep API keys in `.env` or environment variables only.
- For public repository work, verify staged files before committing.

## Product Rules

- Preserve the outline-first flow: generate/approve the table of contents before
  full article writing.
- Keep operator-facing UI steps real. Do not expose mock tabs or fake queues.
- Korean prose should avoid translationese and preserve the humanized style rules
  inspired by `epoko77-ai/im-not-ai`.
