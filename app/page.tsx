import Link from "next/link"

import { PageShell } from "@/components/PageShell"
import { StackedBar } from "@/components/StackedBar"
import { StatusPill } from "@/components/StatusPill"
import { toneVar } from "@/components/tone"
import { getTracker, TONE_LABEL, TONE_ORDER } from "@/lib/notion"
import { completionRate, countByTone, formatDateRange, groupBy, groupByMany, needsAttention } from "@/lib/stats"

export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  const tracker = await getTracker()
  const { tasks, weekColumns } = tracker

  const counts = countByTone(tasks)
  const completion = completionRate(counts)
  const attention = needsAttention(tasks)
  const byTopic = groupBy(tasks, (task) => task.topic, "No topic")
  const byBusinessUnit = groupByMany(tasks, (task) => task.businessUnits, "Unassigned")

  // Show the most recent week that anyone actually wrote in. The newest column
  // is usually created before the week starts, so keying off it alone would
  // leave this panel empty for days at a time.
  const notesForWeek = (key: string) =>
    tasks
      .map((task) => ({ task, note: task.weeks.find((week) => week.key === key)?.note ?? null }))
      .filter((entry): entry is { task: (typeof tasks)[number]; note: string } => Boolean(entry.note))

  const latestWeek = [...weekColumns].reverse().find((week) => notesForWeek(week.key).length > 0) ?? weekColumns.at(-1)
  const latestUpdates = latestWeek ? notesForWeek(latestWeek.key) : []

  return (
    <PageShell tracker={tracker} title="Overview" subtitle="Programme health at a glance">
      <div className="stats">
        <div className="stat">
          <div className="value">{tasks.length}</div>
          <div className="label">Total tasks</div>
          <div className="share">
            {completion.percent}% of {completion.tracked} tracked are done
          </div>
        </div>
        {TONE_ORDER.map((tone) => (
          <div key={tone} className="stat" style={{ ["--tone" as string]: toneVar[tone] }}>
            <div className="value" style={{ color: counts[tone] > 0 ? toneVar[tone] : undefined }}>
              {counts[tone]}
            </div>
            <div className="label">{TONE_LABEL[tone]}</div>
            <div className="share">
              {tasks.length === 0 ? "0%" : `${Math.round((counts[tone] / tasks.length) * 100)}% of all`}
            </div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Status mix</h2>
          <span>All {tasks.length} tasks</span>
        </div>
        <div className="card-body">
          <StackedBar counts={counts} legend />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Needs attention</h2>
          <span>{attention.length} delayed or at risk</span>
        </div>
        {attention.length === 0 ? (
          <div className="empty">Nothing is flagged delayed or at risk right now.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Window</th>
                  <th>2026 target</th>
                </tr>
              </thead>
              <tbody>
                {attention.map(({ id, url, name, topic, subTopic, status, dateStart, dateEnd, target }) => (
                  <tr key={id}>
                    <td>
                      <a className="task-link" href={url} target="_blank" rel="noreferrer">
                        {name}
                      </a>
                      {subTopic ? <div className="muted">{subTopic}</div> : null}
                    </td>
                    <td>{topic ?? <span className="muted">—</span>}</td>
                    <td>
                      <StatusPill status={status} />
                    </td>
                    <td className="muted">{formatDateRange(dateStart, dateEnd) ?? "—"}</td>
                    <td className="note">{target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="card-head">
            <h2>By topic</h2>
            <span>{byTopic.length} topics</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th className="num">Tasks</th>
                  <th style={{ width: "45%" }}>Mix</th>
                </tr>
              </thead>
              <tbody>
                {byTopic.map((group) => (
                  <tr key={group.key}>
                    <td>{group.key}</td>
                    <td className="num">{group.tasks.length}</td>
                    <td>
                      <StackedBar counts={group.counts} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>By business unit</h2>
            <span>Tasks can span several BUs</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Business unit</th>
                  <th className="num">Tasks</th>
                  <th style={{ width: "45%" }}>Mix</th>
                </tr>
              </thead>
              <tbody>
                {byBusinessUnit.map((group) => (
                  <tr key={group.key}>
                    <td>{group.key}</td>
                    <td className="num">{group.tasks.length}</td>
                    <td>
                      <StackedBar counts={group.counts} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>{latestWeek ? `Latest week — ${latestWeek.label}` : "Latest week"}</h2>
          <span>
            {latestUpdates.length} update{latestUpdates.length === 1 ? "" : "s"} ·{" "}
            <Link href="/weekly">see all weeks</Link>
          </span>
        </div>
        {latestUpdates.length === 0 ? (
          <div className="empty">No notes recorded for the most recent week column yet.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th style={{ width: "55%" }}>Update</th>
                </tr>
              </thead>
              <tbody>
                {latestUpdates.map(({ task, note }) => (
                  <tr key={task.id}>
                    <td>
                      <a className="task-link" href={task.url} target="_blank" rel="noreferrer">
                        {task.name}
                      </a>
                      {task.topic ? <div className="muted">{task.topic}</div> : null}
                    </td>
                    <td>
                      <StatusPill status={task.status} />
                    </td>
                    <td className="note">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  )
}
