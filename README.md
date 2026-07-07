# MoCE Social Welfare Assistant

A representative recreation of the Ministry of Community Empowerment (MoCE)
homepage with a floating, collapsible AI chat widget that resolves Social
Welfare Program / Inflation Allowance cases end-to-end — UAE Pass–style
login, case lookup, knowledge retrieval, confidence-scored auto-response vs.
human-review routing, and a feedback loop.

## How it's wired

- `app/page.js` renders the widget component.
- `components/MoCEWebsiteWidget.jsx` is the whole app: homepage + widget.
  It calls **`/api/chat`**, never Anthropic directly.
- `app/api/chat/route.js` is a small server-side proxy: it reads
  `ANTHROPIC_API_KEY` from the server environment and forwards requests to
  Anthropic's Messages API. This keeps your API key off the client entirely.

The chat agent uses a **stop-sequence tool protocol** rather than the
structured `tools` API parameter — the model emits `<use_tool name="...">`
and the request is cut off right there (via `stop_sequences`), so it's
physically unable to fabricate a tool result before the app runs the real
mock lookup and feeds the genuine result back. All backing data (case
records, allowance amounts, SLAs) is mocked in `MoCEWebsiteWidget.jsx` —
see the comment block at the top of that file for which figures are
verified-real vs. illustrative demo data.

## Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste your real Anthropic API key
npm run dev
```

Visit http://localhost:3000.

## Deploying to Vercel

**Option A — Vercel CLI**

```bash
npm install -g vercel
vercel
```

Follow the prompts (link or create a project). Then set the environment
variable and redeploy:

```bash
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

**Option B — Git + Vercel dashboard**

1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In the [Vercel dashboard](https://vercel.com/new), import the repo.
   It auto-detects Next.js — no build config needed.
3. Before the first deploy (or right after), go to
   **Project Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your real key from
     https://console.anthropic.com/settings/keys
4. Redeploy (Vercel redeploys automatically on push once the env var is set).

## Notes / things to double-check before treating this as production

- **Model name**: `components/MoCEWebsiteWidget.jsx` uses `claude-sonnet-5`.
  Check https://docs.claude.com for the current model catalogue before you
  rely on this long-term — model names change over time.
- **Real MoCE logo**: the nav bar loads MoCE's actual logo asset directly
  from `moce.gov.ae`. If that ever gets blocked (some sites disallow
  hotlinking) it falls back to a text wordmark automatically — no action
  needed, but worth knowing.
- **This is a demo, not a production government integration.** All case
  data, complaint statuses, and "system chain" labels (MCP → webMethods →
  Dynamics, etc.) are mocked for demonstration. No real citizen data, real
  MoCE backend, or real UAE Pass integration is involved anywhere in this
  code.
- **Rate limiting / cost**: each citizen turn can involve several sequential
  calls to Claude (one per tool round-trip). There's no rate limiting or
  usage caps built in — add them before exposing this publicly at any scale.
