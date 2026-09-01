"use client"

import { FilterBar, useFilteredTasks } from "@/components/FilterBar"
import { toneVar } from "@/components/tone"
import { statusTone, TONE_LABEL, TONE_ORDER, type Task } from "@/lib/notion"
import { buildTimeline } from "@/lib/timeline"

export function TimelineView({ tasks }: { tasks: Task[] }) {
  const { filters, setFilters, filtered } = useFilteredTasks(tasks)
  const timeline = buildTimeline(filtered)

  return (
    <>
      <FilterBar tasks={tasks} filters={filters} onChange={setFilters} shown={filtered.length} />

      <section className="card">
        <div className="card-head">
          <h2>Schedule</h2>
          <span>
            {timeline.bars.length} dated · {timeline.undated.length} without dates
          </span>
        </div>

        {timeline.bars.length === 0 ? (
          <div className="empty">No task in this selection has a date set in Notion.</div>
        ) : (
          <div className="card-body table-scroll">
            <div className="timeline">
              <div className="tl-row tl-head">
                <div className="tl-label muted">Task</div>
                <div className="tl-months">
                  {timeline.months.map((month) => (
                    <div className="tl-month" key={month.key}>
                      {month.label}
                    </div>
                  ))}
                </div>
              </div>

              {timeline.bars.map(({ task, left, width, start, end }) => {
                const tone = statusTone(task.status)
                return (
                  <div className="tl-row" key={task.id}>
                    <div className="tl-label" title={task.name}>
                      <a href={task.url} target="_blank" rel="noreferrer">
                        {task.name}
                      </a>
                    </div>
                    <div className="tl-track">
                      <div className="tl-grid" aria-hidden="true">
                        {timeline.months.map((month) => (
                          <span key={month.key} />
                        ))}
                      </div>
                      <div
                        className="tl-bar"
                        style={{ left: `${left}%`, width: `${width}%`, background: toneVar[tone] }}
                        title={`${task.name} · ${TONE_LABEL[tone]} · ${start}${end !== start ? ` → ${end}` : ""}`}
                      />
                      {timeline.todayOffset !== null ? (
                        <div className="tl-today" style={{ left: `${timeline.todayOffset}%` }} aria-hidden="true" />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bar-legend">
              {TONE_ORDER.filter((tone) => timeline.bars.some((bar) => statusTone(bar.task.status) === tone)).map(
                (tone) => (
                  <span key={tone}>
                    <i style={{ background: toneVar[tone] }} />
                    {TONE_LABEL[tone]}
                  </span>
                ),
              )}
              {timeline.todayOffset !== null ? (
                <span>
                  <i style={{ background: "var(--accent)" }} />
                  Today
                </span>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {timeline.undated.length > 0 ? (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h2>No dates set</h2>
            <span>{timeline.undated.length} tasks</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Topic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {timeline.undated.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <a className="task-link" href={task.url} target="_blank" rel="noreferrer">
                        {task.name}
                      </a>
                    </td>
                    <td className="muted">{task.topic ?? "—"}</td>
                    <td className="muted">{task.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  )
}
