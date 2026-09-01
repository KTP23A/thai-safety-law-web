import { PageShell } from "@/components/PageShell"
import { StatusPill } from "@/components/StatusPill"
import { getTracker } from "@/lib/notion"
import { groupBy } from "@/lib/stats"

export const dynamic = "force-dynamic"

export default async function WeeklyPage() {
  const tracker = await getTracker()
  const { weekColumns } = tracker
  const byTopic = groupBy(tracker.tasks, (task) => task.topic, "No topic")

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
      {weekColumns.length === 0 ? (
        <div className="card">
          <div className="empty">
            No week columns found. Add a property named like “W38: 14 – 18 Sep” in Notion and it will appear here
            automatically.
          </div>
        </div>
      ) : (
        byTopic.map((group) => (
          <section className="card" key={group.key} style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h2>{group.key}</h2>
              <span>{group.tasks.length} tasks</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Task</th>
                    <th>Sub topic</th>
                    <th>Status</th>
                    {weekColumns.map((week) => (
                      <th key={week.key} title={week.label}>
                        {week.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <a className="task-link" href={task.url} target="_blank" rel="noreferrer">
                          {task.name}
                        </a>
                      </td>
                      <td className="muted compact">{task.subTopic ?? "—"}</td>
                      <td>
                        <StatusPill status={task.status} />
                      </td>
                      {weekColumns.map((week) => {
                        const note = task.weeks.find((cell) => cell.key === week.key)?.note
                        return (
                          <td key={week.key} className="note">
                            {note ?? <span className="muted">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </PageShell>
  )
}
