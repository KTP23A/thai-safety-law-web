"use client"

import { FilterBar, useFilteredTasks } from "@/components/FilterBar"
import { toneVar } from "@/components/tone"
import { statusTone, TONE_LABEL, TONE_ORDER, type StatusTone, type Task } from "@/lib/notion"
import { formatDateRange } from "@/lib/stats"

export function BoardView({ tasks }: { tasks: Task[] }) {
  const { filters, setFilters, filtered } = useFilteredTasks(tasks)

  const columns = new Map<StatusTone, Task[]>(TONE_ORDER.map((tone) => [tone, []]))
  for (const task of filtered) columns.get(statusTone(task.status))!.push(task)

  return (
    <>
      <FilterBar tasks={tasks} filters={filters} onChange={setFilters} shown={filtered.length} />
      <div className="board">
        {TONE_ORDER.map((tone) => {
          const columnTasks = columns.get(tone)!
          return (
            <div className="column" key={tone}>
              <div className="column-head">
                <strong style={{ color: toneVar[tone] }}>{TONE_LABEL[tone]}</strong>
                <em>{columnTasks.length}</em>
              </div>
              {columnTasks.length === 0 ? (
                <div className="empty" style={{ padding: "14px 8px" }}>
                  Empty
                </div>
              ) : (
                columnTasks.map((task) => {
                  const window = formatDateRange(task.dateStart, task.dateEnd)
                  return (
                    <a className="task-card" key={task.id} href={task.url} target="_blank" rel="noreferrer">
                      <div className="title">{task.name}</div>
                      <div className="meta">{[task.topic, task.subTopic].filter(Boolean).join(" · ") || "No topic"}</div>
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
    </>
  )
}
