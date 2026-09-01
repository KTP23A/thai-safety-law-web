import type { Tracker } from "@/lib/notion"

/**
 * Makes the data's provenance unmissable: a dashboard silently serving a stale
 * snapshot is worse than one that says it is doing so.
 */
export function SourceBanner({ tracker }: { tracker: Tracker }) {
  if (tracker.source === "notion") return null

  if (tracker.error) {
    return (
      <div className="banner" data-kind="error">
        <strong>Showing the bundled snapshot.</strong>
        <span>Live query failed — {tracker.error}</span>
      </div>
    )
  }

  return (
    <div className="banner" data-kind="sample">
      <strong>Sample data.</strong>
      <span>
        Set <code>NOTION_TOKEN</code> and share the tracker database with your integration to go live.
      </span>
    </div>
  )
}
