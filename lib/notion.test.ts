import assert from "node:assert/strict"
import { test } from "node:test"

import { __internal, collectWeekColumns, propertyToText, statusTone, type Task } from "./notion.ts"

const { toTask } = __internal

const title = (text: string) => ({ type: "title", title: [{ plain_text: text }] })
const richText = (text: string) => ({ type: "rich_text", rich_text: [{ plain_text: text }] })
const select = (name: string) => ({ type: "select", select: { name } })
const multiSelect = (...names: string[]) => ({
  type: "multi_select",
  multi_select: names.map((name) => ({ name })),
})
const date = (start: string, end?: string) => ({ type: "date", date: { start, end: end ?? null } })

/** Mirrors the real tracker, trailing spaces in property names included. */
function samplePage() {
  return {
    id: "3490c4e7-a78e-8120-b615-f1ee28df6804",
    url: "https://www.notion.so/task",
    properties: {
      "Task Name": title("A1. Request RA WH data"),
      Topic: select("1. Safety Enhancement"),
      "Sub topic": richText("RA"),
      status: select("🟢 Done"),
      "26 Target": richText("Tracking update RA of WH E/ Sep"),
      "Full Task Detail": richText("RA WH list"),
      "Related BU": multiSelect("Warehouse", "Retail"),
      "Review Goal": select("G1 Safety RA"),
      Date: date("2026-02-20", "2026-03-13"),
      "Q1 task": richText("Launch RA format"),
      "Q2 task": richText("Complete RA of each WH-GC"),
      "Q2 status ": select("🟢 On Track"),
      "W35: 24 - 28 Aug": richText("TBSC warehouse RA training"),
      "W36: 31 Aug - 4 Sep": { type: "rich_text", rich_text: [] },
      "# Updates": { type: "rollup", rollup: { type: "number", number: 3 } },
    },
  }
}

test("maps core properties", () => {
  const task = toTask(samplePage())
  assert.equal(task.name, "A1. Request RA WH data")
  assert.equal(task.topic, "1. Safety Enhancement")
  assert.equal(task.subTopic, "RA")
  assert.equal(task.status, "🟢 Done")
  assert.equal(task.reviewGoal, "G1 Safety RA")
  assert.deepEqual(task.businessUnits, ["Warehouse", "Retail"])
  assert.equal(task.dateStart, "2026-02-20")
  assert.equal(task.dateEnd, "2026-03-13")
})

test("reads quarter columns despite trailing spaces in their names", () => {
  const task = toTask(samplePage())
  const q2 = task.quarters.find((quarter) => quarter.quarter === "Q2")
  assert.equal(q2?.status, "🟢 On Track", "Q2 status  (trailing space) must still be found")
  assert.equal(q2?.task, "Complete RA of each WH-GC")

  // Q1 has a task but no status column; it should still appear.
  assert.equal(task.quarters.find((quarter) => quarter.quarter === "Q1")?.task, "Launch RA format")
  // Q3/Q4 are absent entirely and must not be invented.
  assert.equal(task.quarters.find((quarter) => quarter.quarter === "Q3"), undefined)
})

test("discovers week columns dynamically and keeps them ordered", () => {
  const task = toTask(samplePage())
  assert.deepEqual(
    task.weeks.map((week) => week.key),
    ["W35", "W36"],
  )
  assert.equal(task.weeks[0].note, "TBSC warehouse RA training")
  assert.equal(task.weeks[1].note, null, "an empty rich_text cell is null, not an empty string")

  const columns = collectWeekColumns([task])
  assert.deepEqual(
    columns.map((column) => column.key),
    ["W35", "W36"],
  )
  assert.equal(columns[1].label, "W36: 31 Aug - 4 Sep")
})

test("week columns union across tasks and sort numerically, not lexically", () => {
  const make = (labels: string[]): Task =>
    toTask({
      id: "x",
      properties: Object.fromEntries([
        ["Task Name", title("t")],
        ...labels.map((label) => [label, richText("note")] as const),
      ]),
    })

  const columns = collectWeekColumns([make(["W9: early", "W37: 7 - 11 Sep"]), make(["W10: mid"])])
  assert.deepEqual(
    columns.map((column) => column.key),
    ["W9", "W10", "W37"],
  )
})

test("falls back to whichever property is the title", () => {
  const task = toTask({
    id: "y",
    properties: { Name: title("Renamed title column"), Topic: select("6. Global") },
  })
  assert.equal(task.name, "Renamed title column")
})

test("builds a Notion URL when the API omits one", () => {
  const task = toTask({ id: "3490c4e7-a78e-8120-b615-f1ee28df6804", properties: {} })
  assert.equal(task.url, "https://www.notion.so/3490c4e7a78e8120b615f1ee28df6804")
  assert.equal(task.name, "Untitled")
})

test("statusTone reads the words, not the emoji", () => {
  // The same word carries different emoji in the overall and per-quarter columns.
  assert.equal(statusTone("🟢 Done"), "done")
  assert.equal(statusTone("🔵 Done"), "done")
  assert.equal(statusTone("🔵 On Track"), "ontrack")
  assert.equal(statusTone("🟢 On Track"), "ontrack")
  assert.equal(statusTone("🟢 On Progress"), "ontrack")
  assert.equal(statusTone("🟠 Delayed"), "delayed")
  assert.equal(statusTone("delayed"), "delayed")
  assert.equal(statusTone("🔴 At Risk"), "atrisk")
  assert.equal(statusTone("⚪ TBD"), "tbd")
  assert.equal(statusTone(null), "none")
})

test("propertyToText flattens the property types the tracker uses", () => {
  assert.equal(propertyToText({ type: "rollup", rollup: { type: "number", number: 3 } }), "3")
  assert.equal(propertyToText({ type: "date", date: { start: "2026-01-01", end: "2026-12-31" } }), "2026-01-01 → 2026-12-31")
  assert.equal(propertyToText(multiSelect("A", "B")), "A, B")
  assert.equal(propertyToText({ type: "rich_text", rich_text: [{ plain_text: "   " }] }), null)
  assert.equal(propertyToText({ type: "checkbox", checkbox: true }), "Yes")
  assert.equal(propertyToText(null), null)
})
