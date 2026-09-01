import { PageShell } from "@/components/PageShell"
import { toneVar } from "@/components/tone"
import { getTracker, statusTone, TONE_LABEL, TONE_ORDER, type StatusTone, type Task } from "@/lib/notion"
import { formatDateRange } from "@/lib/stats"

export const dynamic = "force-dynamic"

export default async function BoardPage() {
  const tracker = await getTracker()

  const columns = new Map<StatusTone, Task[]>(TONE_ORDER.map((tone) => [tone, []]))
  for (const task of tracker.tasks) {
    columns.get(statusTone(task.status))!.push(task)
  }

  return (
    <PageShell tracker={tracker} title="Board" subtitle="Grouped by overall status">
      <div className="board">
        {TONE_ORDER.map((tone) => {
          const tasks = columns.get(tone)!
          return (
            <div className="column" key={tone}>
              <div className="column-head">
                <strong style={{ color: toneVar[tone] }}>{TONE_LABEL[tone]}</strong>
                <em>{tasks.length}</em>
              </div>
              {tasks.length === 0 ? (
                <div className="empty" style={{ padding: "14px 8px" }}>
                  Empty
                </div>
              ) : (
                tasks.map((task) => {
                  const window = formatDateRange(task.dateStart, task.dateEnd)
                  return (
                    <a className="task-card" key={task.id} href={task.url} target="_blank" rel="noreferrer">
                      <div className="title">{task.name}</div>
                      <div className="meta">
                        {[task.topic, task.subTopic].filter(Boolean).join(" · ") || "No topic"}
                      </div>
                      {task.businessUnits.length > 0 ? (
                        <div className="tags" style={{ marginTop: 6 }}>
                          {task.businessUnits.map((unit) => (
                            <span className="tag" key={unit}>
                              {unit}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {window ? <div className="meta">{window}</div> : null}
                    </a>
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
