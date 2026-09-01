import assert from "node:assert/strict"
import { test } from "node:test"

import type { Task } from "./notion.ts"
import { buildTimeline } from "./timeline.ts"

function task(id: string, dateStart: string | null, dateEnd: string | null = null): Task {
  return {
    id,
    url: `https://www.notion.so/${id}`,
    name: id,
    topic: null,
    subTopic: null,
    status: null,
    target: null,
    detail: null,
    reviewGoal: null,
    businessUnits: [],
    dateStart,
    dateEnd,
    quarters: [],
    weeks: [],
  }
}

test("separates dated from undated tasks instead of dropping them", () => {
  const timeline = buildTimeline([task("a", "2026-01-01", "2026-03-31"), task("b", null)])
  assert.equal(timeline.bars.length, 1)
  assert.deepEqual(
    timeline.undated.map((entry) => entry.id),
    ["b"],
  )
})

test("snaps the scale to whole months and spans the full range", () => {
  const timeline = buildTimeline([task("a", "2026-01-15", "2026-03-10")])
  assert.deepEqual(
    timeline.months.map((month) => month.key),
    ["2026-1", "2026-2", "2026-3"],
  )
  const bar = timeline.bars[0]
  assert.ok(bar.left > 0 && bar.left < 100, `left ${bar.left} should sit inside the scale`)
  assert.ok(bar.left + bar.width <= 100.001, "a bar must never overflow the track")
})

test("a start with no end still gets a visible bar", () => {
  const timeline = buildTimeline([task("a", "2026-05-11", null), task("b", "2026-01-01", "2026-12-31")])
  const bar = timeline.bars.find((entry) => entry.task.id === "a")!
  assert.ok(bar.width > 0, "zero-length tasks need a minimum width")
  assert.equal(bar.start, "2026-05-11")
})

test("an end with no start is treated as a point in time", () => {
  const timeline = buildTimeline([task("a", null, "2026-07-01")])
  assert.equal(timeline.bars.length, 1)
  assert.equal(timeline.bars[0].start, "2026-07-01")
})

test("today marker only appears when today falls inside the range", () => {
  const tasks = [task("a", "2026-01-01", "2026-12-31")]
  assert.notEqual(buildTimeline(tasks, new Date("2026-06-15")).todayOffset, null)
  assert.equal(buildTimeline(tasks, new Date("2030-06-15")).todayOffset, null)
})

test("bars sort by start date", () => {
  const timeline = buildTimeline([task("late", "2026-09-01"), task("early", "2026-02-01")])
  assert.deepEqual(
    timeline.bars.map((bar) => bar.task.id),
    ["early", "late"],
  )
})

test("no dated tasks yields an empty scale rather than throwing", () => {
  const timeline = buildTimeline([task("a", null)])
  assert.deepEqual(timeline.bars, [])
  assert.deepEqual(timeline.months, [])
  assert.equal(timeline.todayOffset, null)
})
