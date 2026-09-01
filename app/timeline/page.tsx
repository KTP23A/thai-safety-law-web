import { PageShell } from "@/components/PageShell"
import { TimelineView } from "@/components/TimelineView"
import { getTracker } from "@/lib/notion"

export const dynamic = "force-dynamic"

export default async function TimelinePage() {
  const tracker = await getTracker()
  return (
    <PageShell tracker={tracker} title="Timeline" subtitle="Every dated task on one month scale">
      <TimelineView tasks={tracker.tasks} />
    </PageShell>
  )
}
