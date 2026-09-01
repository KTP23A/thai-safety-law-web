import { PageShell } from "@/components/PageShell"
import { WeeklyView } from "@/components/WeeklyView"
import { getTracker } from "@/lib/notion"

export const dynamic = "force-dynamic"

export default async function WeeklyPage() {
  const tracker = await getTracker()
  const { weekColumns } = tracker

  return (
    <PageShell
      tracker={tracker}
      title="Weekly"
      subtitle={
        weekColumns.length > 0
          ? `${weekColumns.length} week columns, ${weekColumns[0].key}–${weekColumns.at(-1)!.key}`
          : "No week columns yet"
      }
    >
      <WeeklyView tasks={tracker.tasks} weekColumns={weekColumns} />
    </PageShell>
  )
}
