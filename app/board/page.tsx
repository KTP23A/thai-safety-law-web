import { BoardView } from "@/components/BoardView"
import { PageShell } from "@/components/PageShell"
import { getTracker } from "@/lib/notion"

export const dynamic = "force-dynamic"

export default async function BoardPage() {
  const tracker = await getTracker()
  return (
    <PageShell tracker={tracker} title="Board" subtitle="Grouped by overall status">
      <BoardView tasks={tracker.tasks} />
    </PageShell>
  )
}
