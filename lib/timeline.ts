import type { Task } from "@/lib/notion"

export type TimelineBar = {
  task: Task
  /** Percentage offsets across the whole timeline range. */
  left: number
  width: number
  start: string
  end: string
}

export type TimelineMonth = { key: string; label: string }

export type Timeline = {
  bars: TimelineBar[]
  months: TimelineMonth[]
  /** Percentage offset of today, or null when today falls outside the range. */
  todayOffset: number | null
  /** Tasks carrying no dates at all — shown separately rather than dropped. */
  undated: Task[]
}

const DAY_MS = 86_400_000

function parse(value: string | null): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function monthsBetween(from: Date, to: Date): TimelineMonth[] {
  const months: TimelineMonth[] = []
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
  const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1)
  // Bounded so a bad date can never produce an unbounded loop.
  while (cursor.getTime() <= last && months.length < 120) {
    months.push({
      key: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`,
      label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

/**
 * Lays tasks out on a shared month scale. A task with a start but no end gets a
 * short marker bar rather than being dropped — "starts in November" is still
 * information worth showing.
 */
export function buildTimeline(tasks: Task[], now = new Date()): Timeline {
  const dated: { task: Task; start: number; end: number }[] = []
  const undated: Task[] = []

  for (const task of tasks) {
    const start = parse(task.dateStart)
    const end = parse(task.dateEnd)
    if (start === null && end === null) {
      undated.push(task)
      continue
    }
    const from = start ?? (end as number)
    const to = Math.max(end ?? from, from)
    dated.push({ task, start: from, end: to })
  }

  if (dated.length === 0) {
    return { bars: [], months: [], todayOffset: null, undated }
  }

  const rangeStart = Math.min(...dated.map((entry) => entry.start))
  const rangeEnd = Math.max(...dated.map((entry) => entry.end))
  const months = monthsBetween(new Date(rangeStart), new Date(rangeEnd))

  // Snap the scale to whole months so bars line up with the gridlines.
  const first = new Date(rangeStart)
  const scaleStart = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)
  const last = new Date(rangeEnd)
  const scaleEnd = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1)
  const span = Math.max(scaleEnd - scaleStart, DAY_MS)

  const pct = (time: number) => ((time - scaleStart) / span) * 100

  const bars = dated
    .sort((a, b) => a.start - b.start)
    .map(({ task, start, end }) => {
      const left = pct(start)
      // A zero-length task still needs to be visible.
      const width = Math.max(pct(end) - left, (DAY_MS * 5 * 100) / span)
      return {
        task,
        left,
        width: Math.min(width, 100 - left),
        start: new Date(start).toISOString().slice(0, 10),
        end: new Date(end).toISOString().slice(0, 10),
      }
    })

  const nowTime = now.getTime()
  const todayOffset = nowTime >= scaleStart && nowTime <= scaleEnd ? pct(nowTime) : null

  return { bars, months, todayOffset, undated }
}
