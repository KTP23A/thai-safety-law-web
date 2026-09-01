import { Nav } from "@/components/Nav"
import { SourceBanner } from "@/components/SourceBanner"
import { DEFAULT_DATABASE_ID, type Tracker } from "@/lib/notion"

const NOTION_URL = `https://www.notion.so/${DEFAULT_DATABASE_ID}`

function syncedLabel(tracker: Tracker) {
  const time = new Date(tracker.fetchedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return tracker.source === "notion" ? `Synced from Notion at ${time}` : `Snapshot rendered at ${time}`
}

export function PageShell({
  tracker,
  title,
  subtitle,
  children,
}: {
  tracker: Tracker
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>🔥 KTP IIP26 — Master Tracker 2026</h1>
          <p>
            {title} · {subtitle}
          </p>
        </div>
        <p>
          {syncedLabel(tracker)} · {tracker.tasks.length} tasks
        </p>
      </header>

      <Nav />
      <SourceBanner tracker={tracker} />

      {children}

      <footer className="footer">
        <span>Read-only view. Edit in Notion — changes appear here on the next sync.</span>
        <a href={NOTION_URL} target="_blank" rel="noreferrer">
          Open the tracker in Notion ↗
        </a>
      </footer>
    </main>
  )
}
