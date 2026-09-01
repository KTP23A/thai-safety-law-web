"use client"

import { FilterBar, useFilteredTasks } from "@/components/FilterBar"
import { StatusPill } from "@/components/StatusPill"
import type { Task, WeekColumn } from "@/lib/notion"
import { groupBy } from "@/lib/stats"

export function WeeklyView({ tasks, weekColumns }: { tasks: Task[]; weekColumns: WeekColumn[] }) {
  const { filters, setFilters, filtered } = useFilteredTasks(tasks)
  const byTopic = groupBy(filtered, (task) => task.topic, "No topic")

  return (
    <>
      <FilterBar tasks={tasks} filters={filters} onChange={setFilters} shown={filtered.length} />

      {weekColumns.length === 0 ? (
        <div className="card">
          <div className="empty">
            No week columns found. Add a property named like “W38: 14 – 18 Sep” in Notion and it will appear here
            automatically.
          </div>
        </div>
      ) : byTopic.length === 0 ? (
        <div className="card">
          <div className="empty">No tasks match these filters.</div>
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
    </>
  )
}
