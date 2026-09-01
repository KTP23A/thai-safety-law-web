import { statusTone, TONE_ORDER, type StatusTone, type Task } from "@/lib/notion"

export type ToneCounts = Record<StatusTone, number>

export function emptyCounts(): ToneCounts {
  return { done: 0, ontrack: 0, delayed: 0, atrisk: 0, tbd: 0, none: 0 }
}

export function countByTone(tasks: Task[]): ToneCounts {
  const counts = emptyCounts()
  for (const task of tasks) counts[statusTone(task.status)] += 1
  return counts
}

export type Group = { key: string; tasks: Task[]; counts: ToneCounts }

/** Groups tasks by a single-valued key, preserving first-seen order of keys. */
export function groupBy(tasks: Task[], keyOf: (task: Task) => string | null, fallback = "Unassigned"): Group[] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = keyOf(task) ?? fallback
    const bucket = groups.get(key)
    if (bucket) bucket.push(task)
    else groups.set(key, [task])
  }
  return [...groups.entries()]
    .map(([key, groupTasks]) => ({ key, tasks: groupTasks, counts: countByTone(groupTasks) }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
}

/** Groups by a multi-valued key; a task with two BUs appears in both groups. */
export function groupByMany(tasks: Task[], keysOf: (task: Task) => string[], fallback = "Unassigned"): Group[] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const keys = keysOf(task)
    for (const key of keys.length > 0 ? keys : [fallback]) {
      const bucket = groups.get(key)
      if (bucket) bucket.push(task)
      else groups.set(key, [task])
    }
  }
  return [...groups.entries()]
    .map(([key, groupTasks]) => ({ key, tasks: groupTasks, counts: countByTone(groupTasks) }))
    .sort((a, b) => b.tasks.length - a.tasks.length || a.key.localeCompare(b.key))
}

/** Tasks whose overall status is delayed or at risk, most severe first. */
export function needsAttention(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => {
      const tone = statusTone(task.status)
      return tone === "atrisk" || tone === "delayed"
    })
    .sort((a, b) => TONE_ORDER.indexOf(statusTone(a.status)) - TONE_ORDER.indexOf(statusTone(b.status)))
}

/**
 * Completion share counted over tasks that carry a status at all — tasks left
 * blank in Notion would otherwise drag the percentage down without meaning it.
 */
export function completionRate(counts: ToneCounts): { done: number; tracked: number; percent: number } {
  const tracked = counts.done + counts.ontrack + counts.delayed + counts.atrisk
  const percent = tracked === 0 ? 0 : Math.round((counts.done / tracked) * 100)
  return { done: counts.done, tracked, percent }
}

export function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  const format = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }
  if (start && end) return `${format(start)} – ${format(end)}`
  return format((start ?? end) as string)
}
