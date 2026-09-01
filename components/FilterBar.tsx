"use client"

import { useMemo, useState } from "react"

import { statusTone, TONE_LABEL, TONE_ORDER, type StatusTone, type Task } from "@/lib/notion"

export type Filters = { topic: string; unit: string; tone: string; query: string }

export const EMPTY_FILTERS: Filters = { topic: "", unit: "", tone: "", query: "" }

export function applyFilters(tasks: Task[], filters: Filters): Task[] {
  const query = filters.query.trim().toLowerCase()
  return tasks.filter((task) => {
    if (filters.topic && (task.topic ?? "") !== filters.topic) return false
    if (filters.unit && !task.businessUnits.includes(filters.unit)) return false
    if (filters.tone && statusTone(task.status) !== filters.tone) return false
    if (query) {
      const haystack = [task.name, task.subTopic, task.topic, task.target, task.detail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

/** Shared filter row. Filters live above the views they act on, in one row. */
export function FilterBar({
  tasks,
  filters,
  onChange,
  shown,
}: {
  tasks: Task[]
  filters: Filters
  onChange: (filters: Filters) => void
  shown: number
}) {
  const { topics, units, tones } = useMemo(() => {
    const topicSet = new Set<string>()
    const unitSet = new Set<string>()
    const toneSet = new Set<StatusTone>()
    for (const task of tasks) {
      if (task.topic) topicSet.add(task.topic)
      for (const unit of task.businessUnits) unitSet.add(unit)
      toneSet.add(statusTone(task.status))
    }
    return {
      topics: [...topicSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      units: [...unitSet].sort(),
      tones: TONE_ORDER.filter((tone) => toneSet.has(tone)),
    }
  }, [tasks])

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const active = filters.topic || filters.unit || filters.tone || filters.query

  return (
    <div className="filters">
      <select aria-label="Filter by topic" value={filters.topic} onChange={(event) => set({ topic: event.target.value })}>
        <option value="">All topics</option>
        {topics.map((topic) => (
          <option key={topic} value={topic}>
            {topic}
          </option>
        ))}
      </select>

      <select aria-label="Filter by business unit" value={filters.unit} onChange={(event) => set({ unit: event.target.value })}>
        <option value="">All business units</option>
        {units.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>

      <select aria-label="Filter by status" value={filters.tone} onChange={(event) => set({ tone: event.target.value })}>
        <option value="">All statuses</option>
        {tones.map((tone) => (
          <option key={tone} value={tone}>
            {TONE_LABEL[tone]}
          </option>
        ))}
      </select>

      <input
        type="search"
        aria-label="Search tasks"
        placeholder="Search tasks…"
        value={filters.query}
        onChange={(event) => set({ query: event.target.value })}
      />

      <span className="count">
        {shown} of {tasks.length}
      </span>

      {active ? (
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear
        </button>
      ) : null}
    </div>
  )
}

/** Convenience hook: owns filter state and returns the filtered list. */
export function useFilteredTasks(tasks: Task[]) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const filtered = useMemo(() => applyFilters(tasks, filters), [tasks, filters])
  return { filters, setFilters, filtered }
}
