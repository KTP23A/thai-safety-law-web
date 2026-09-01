import { PageShell } from "@/components/PageShell"
import { StackedBar } from "@/components/StackedBar"
import { StatusPill } from "@/components/StatusPill"
import { getTracker, statusTone } from "@/lib/notion"
import { emptyCounts } from "@/lib/stats"

export const dynamic = "force-dynamic"

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const

export default async function QuartersPage() {
  const tracker = await getTracker()

  const sections = QUARTERS.map((quarter) => {
    const rows = tracker.tasks
      .map((task) => ({ task, cell: task.quarters.find((entry) => entry.quarter === quarter) }))
      .filter((row): row is { task: (typeof tracker.tasks)[number]; cell: NonNullable<typeof row.cell> } =>
        Boolean(row.cell),
      )

    const counts = emptyCounts()
    for (const row of rows) counts[statusTone(row.cell.status)] += 1

    return { quarter, rows, counts }
  })

  const planned = sections.reduce((sum, section) => sum + section.rows.length, 0)

  return (
    <PageShell tracker={tracker} title="Quarters" subtitle={`${planned} quarterly commitments across Q1–Q4`}>
      {sections.map((section) => (
        <section className="card" key={section.quarter} style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h2>{section.quarter}</h2>
            <span>
              {section.rows.length} task{section.rows.length === 1 ? "" : "s"}
            </span>
          </div>
          {section.rows.length === 0 ? (
            <div className="empty">Nothing planned for {section.quarter} yet.</div>
          ) : (
            <>
              <div className="card-body" style={{ paddingBottom: 0 }}>
                <StackedBar counts={section.counts} legend />
              </div>
              <div className="table-scroll" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Task</th>
                      <th>Topic</th>
                      <th>{section.quarter} status</th>
                      <th style={{ width: "45%" }}>{section.quarter} plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map(({ task, cell }) => (
                      <tr key={task.id}>
                        <td>
                          <a className="task-link" href={task.url} target="_blank" rel="noreferrer">
                            {task.name}
                          </a>
                          {task.subTopic ? <div className="muted">{task.subTopic}</div> : null}
                        </td>
                        <td className="muted">{task.topic ?? "—"}</td>
                        <td>
                          <StatusPill status={cell.status} fallback={false} />
                        </td>
                        <td className="note">{cell.task ?? <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ))}
    </PageShell>
  )
}
