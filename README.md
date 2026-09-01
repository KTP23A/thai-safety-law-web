# IIP26 Master Tracker — web dashboard

A read-only web view of the Notion database
[**🔥 📋 KTP IIP26 — Master Tracker 2026**](https://www.notion.so/7538e2f50349425ab3e2173a81c8fd41).

Notion stays the single place anyone edits. This app queries it live and renders
four views that are awkward to get inside Notion itself:

| Route       | What it shows                                                                       |
| ----------- | ----------------------------------------------------------------------------------- |
| `/`         | KPI tiles, status mix, everything delayed or at risk, breakdowns by topic and BU, and the most recent week's updates |
| `/weekly`   | The weekly table — one column per `W…` property, grouped by topic                    |
| `/board`    | Kanban grouped by overall status                                                    |
| `/quarters` | Q1–Q4 commitments with each quarter's own plan and status                            |

Every task title links back to its Notion page, so the edit path is one click away.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in NOTION_TOKEN
npm run dev                  # http://localhost:3000
```

Without `NOTION_TOKEN` the app runs against a bundled snapshot of the tracker and
shows an orange "Sample data" banner — useful for design work, and it means the
app never boots into a blank error page.

### Connecting Notion

1. Create an internal integration at <https://www.notion.so/my-integrations> and
   copy its secret (`ntn_…`) into `NOTION_TOKEN`.
2. Open the tracker database in Notion → `•••` → **Connections** → add that
   integration. **This step is what most often gets missed** — without it Notion
   returns 404 for the database even though the token is valid.
3. Restart the dev server.

| Variable                | Required | Purpose                                                                 |
| ----------------------- | -------- | ----------------------------------------------------------------------- |
| `NOTION_TOKEN`          | yes      | Integration secret. Without it the app serves the bundled snapshot.      |
| `NOTION_DATABASE_ID`    | no       | Defaults to the IIP26 tracker. Set it to point at a different database.  |
| `NOTION_DATA_SOURCE_ID` | no       | Skips one lookup call per cache miss.                                    |
| `REVALIDATE_SECONDS`    | no       | How long a query is reused before Notion is hit again. Default `300`.    |

## Deploying

Push the branch, import the repo on Vercel, and set `NOTION_TOKEN` (plus any
overrides above) as environment variables. `vercel.json` already selects the
Next.js framework preset; no other configuration is needed.

## How it handles the tracker's quirks

The schema is edited by hand week to week, so the mapping in `lib/notion.ts` is
deliberately tolerant:

- **Week columns are discovered, not hardcoded.** Any property named like
  `W38: 14 - 18 Sep` is picked up automatically and sorted numerically, so adding
  next week's column in Notion is all that's needed — no code change, no deploy.
- **Property names are matched after trimming and lowercasing.** Several columns
  carry stray whitespace (`Q2 status `, `Q4 status `), which an exact-match lookup
  would silently miss.
- **Status colours come from the words, not the emoji.** The overall column uses
  🟢 Done / 🔵 On Track while the quarter columns use 🔵 Done / 🟢 On Track; matching
  on the label text keeps both consistent.
- **Both Notion API generations are supported.** The newer data-source API
  (`2025-09-03`) is tried first and the older database query (`2022-06-28`) is the
  fallback, so the app keeps working through the workspace migration.
- **Completion % counts only tasks that have a status**, so the many still-blank
  rows don't drag the number down without meaning to.
- **Failures degrade instead of crashing.** If Notion errors, the last-resort
  snapshot renders behind a red banner naming the actual error, and the failure
  is only cached for 15 seconds so it recovers on its own.

## Checks

```bash
npm test        # property-mapping tests (node --test)
npm run typecheck
npm run build
```

`data/sample-tracker.json` is a snapshot taken on 2026-09-01. It is only ever
used as the offline fallback; regenerate it by hand if the shape of the tracker
changes substantially.
