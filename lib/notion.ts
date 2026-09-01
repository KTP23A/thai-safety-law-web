/**
 * Notion access layer for the "KTP IIP26 — Master Tracker 2026" database.
 *
 * Talks to the REST API directly rather than through the SDK so that both the
 * data-source API (2025-09-03) and the older database API (2022-06-28) can be
 * used from the same code path — Notion workspaces are migrated at different
 * times, and a hard dependency on either one breaks on the other.
 */

const NOTION_API = "https://api.notion.com/v1"
const DATA_SOURCE_VERSION = "2025-09-03"
const LEGACY_VERSION = "2022-06-28"

export const DEFAULT_DATABASE_ID = "7538e2f50349425ab3e2173a81c8fd41"
/** The "📈 Progress Log 2026" database that the tracker's relation points at. */
export const DEFAULT_PROGRESS_DATABASE_ID = "7a00bb8779bb46339838976afb4e5015"

export type StatusTone = "done" | "ontrack" | "delayed" | "atrisk" | "tbd" | "none"

export type QuarterCell = {
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  task: string | null
  status: string | null
}

export type WeekCell = {
  /** Stable key, e.g. "W36". */
  key: string
  /** Full Notion property name, e.g. "W36: 31 Aug - 4 Sep". */
  label: string
  note: string | null
}

export type Task = {
  id: string
  url: string
  name: string
  topic: string | null
  subTopic: string | null
  status: string | null
  target: string | null
  detail: string | null
  reviewGoal: string | null
  businessUnits: string[]
  dateStart: string | null
  dateEnd: string | null
  quarters: QuarterCell[]
  weeks: WeekCell[]
}

export type WeekColumn = { key: string; label: string; number: number }

/** A row of the "📈 Progress Log 2026" database. */
export type ProgressUpdate = {
  id: string
  url: string
  title: string
  date: string | null
  period: string | null
  status: string | null
  progress: string | null
  nextStep: string | null
  reportToManagement: boolean
  /** Normalized ids of the tracker tasks this update is filed against. */
  taskIds: string[]
}

export type Tracker = {
  tasks: Task[]
  weekColumns: WeekColumn[]
  updates: ProgressUpdate[]
  /** "notion" when served live; "sample" when the bundled snapshot was used. */
  source: "notion" | "sample"
  fetchedAt: string
  /** Set when a live fetch was attempted and failed. */
  error: string | null
}

export class NotionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "NotionError"
    this.status = status
  }
}

/* -------------------------------------------------------------------------- */
/* Property helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Several columns in this tracker carry stray whitespace ("Q2 status ") and
 * inconsistent casing, so every lookup goes through a normalized key.
 */
function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Notion returns page ids dashed in some places and bare in others. */
export function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase()
}

function readRelationIds(property: unknown): string[] {
  const prop = property as { type?: string; relation?: { id?: string }[] }
  if (prop?.type !== "relation" || !Array.isArray(prop.relation)) return []
  return prop.relation.map((item) => item?.id).filter((id): id is string => Boolean(id)).map(normalizeId)
}

type PropertyBag = Record<string, unknown>

function richTextToPlain(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const text = value
    .map((node) => (node as { plain_text?: string })?.plain_text ?? "")
    .join("")
    .trim()
  return text.length > 0 ? text : null
}

/** Flattens any Notion property value to plain text (or null when empty). */
export function propertyToText(property: unknown): string | null {
  if (!property || typeof property !== "object") return null
  const prop = property as { type?: string; [key: string]: unknown }

  switch (prop.type) {
    case "title":
      return richTextToPlain(prop.title)
    case "rich_text":
      return richTextToPlain(prop.rich_text)
    case "select":
      return (prop.select as { name?: string } | null)?.name ?? null
    case "status":
      return (prop.status as { name?: string } | null)?.name ?? null
    case "multi_select": {
      const names = propertyToStrings(property)
      return names.length > 0 ? names.join(", ") : null
    }
    case "number":
      return prop.number === null || prop.number === undefined ? null : String(prop.number)
    case "checkbox":
      return prop.checkbox ? "Yes" : "No"
    case "url":
    case "email":
    case "phone_number":
      return (prop[prop.type] as string | null) ?? null
    case "created_time":
    case "last_edited_time":
      return (prop[prop.type] as string | null) ?? null
    case "date": {
      const date = prop.date as { start?: string; end?: string } | null
      if (!date?.start) return null
      return date.end ? `${date.start} → ${date.end}` : date.start
    }
    case "people":
      return (
        (prop.people as { name?: string }[] | undefined)
          ?.map((person) => person?.name)
          .filter(Boolean)
          .join(", ") || null
      )
    case "formula": {
      const formula = prop.formula as { type?: string; [key: string]: unknown } | null
      if (!formula?.type) return null
      const inner = formula[formula.type]
      if (inner === null || inner === undefined) return null
      if (typeof inner === "object") return propertyToText({ type: formula.type, [formula.type]: inner })
      return String(inner)
    }
    case "rollup": {
      const rollup = prop.rollup as { type?: string; [key: string]: unknown } | null
      if (!rollup?.type) return null
      if (rollup.type === "array") {
        const items = (rollup.array as unknown[]) ?? []
        const parts = items.map((item) => propertyToText(item)).filter(Boolean)
        return parts.length > 0 ? parts.join(", ") : null
      }
      const inner = rollup[rollup.type]
      return inner === null || inner === undefined ? null : String(inner)
    }
    default:
      return null
  }
}

/** Multi-value properties (multi_select, relation) as an array of strings. */
export function propertyToStrings(property: unknown): string[] {
  if (!property || typeof property !== "object") return []
  const prop = property as { type?: string; [key: string]: unknown }
  if (prop.type === "multi_select") {
    return ((prop.multi_select as { name?: string }[] | undefined) ?? [])
      .map((option) => option?.name)
      .filter((name): name is string => Boolean(name))
  }
  const text = propertyToText(property)
  return text ? [text] : []
}

function readDate(property: unknown): { start: string | null; end: string | null } {
  const prop = property as { type?: string; date?: { start?: string; end?: string } | null }
  if (prop?.type !== "date" || !prop.date) return { start: null, end: null }
  return { start: prop.date.start ?? null, end: prop.date.end ?? null }
}

/**
 * Maps a status label to a colour tone. Matching is on the words rather than
 * the exact option name because the same words carry different emoji in
 * different columns ("🟢 Done" on the overall status, "🔵 Done" per quarter).
 */
export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "none"
  const text = status.toLowerCase()
  if (text.includes("risk")) return "atrisk"
  if (text.includes("delay")) return "delayed"
  if (text.includes("done") || text.includes("complet")) return "done"
  if (text.includes("track") || text.includes("progress")) return "ontrack"
  if (text.includes("tbd")) return "tbd"
  return "none"
}

export const TONE_LABEL: Record<StatusTone, string> = {
  done: "Done",
  ontrack: "On Track",
  delayed: "Delayed",
  atrisk: "At Risk",
  tbd: "TBD",
  none: "No status",
}

/** Display order used by every grouping in the UI. */
export const TONE_ORDER: StatusTone[] = ["atrisk", "delayed", "ontrack", "done", "tbd", "none"]

/* -------------------------------------------------------------------------- */
/* Page → Task                                                                */
/* -------------------------------------------------------------------------- */

const WEEK_PATTERN = /^w(\d{1,2})\b/i
const QUARTER_TASK_PATTERN = /^q([1-4]) task$/
const QUARTER_STATUS_PATTERN = /^q([1-4]) status$/

function toTask(page: { id: string; url?: string; properties?: PropertyBag }): Task {
  const properties = page.properties ?? {}
  const byKey = new Map<string, { name: string; value: unknown }>()
  for (const [name, value] of Object.entries(properties)) {
    byKey.set(normalizeKey(name), { name, value })
  }

  const get = (name: string) => byKey.get(normalizeKey(name))?.value
  const text = (name: string) => propertyToText(get(name))

  const quarters: QuarterCell[] = []
  for (const quarter of ["Q1", "Q2", "Q3", "Q4"] as const) {
    let task: string | null = null
    let status: string | null = null
    for (const [key, entry] of byKey) {
      const taskMatch = key.match(QUARTER_TASK_PATTERN)
      const statusMatch = key.match(QUARTER_STATUS_PATTERN)
      if (taskMatch && `Q${taskMatch[1]}` === quarter) task = propertyToText(entry.value)
      if (statusMatch && `Q${statusMatch[1]}` === quarter) status = propertyToText(entry.value)
    }
    if (task || status) quarters.push({ quarter, task, status })
  }

  const weeks: WeekCell[] = []
  for (const [key, entry] of byKey) {
    const match = key.match(WEEK_PATTERN)
    if (!match) continue
    weeks.push({
      key: `W${match[1]}`,
      label: entry.name.trim(),
      note: propertyToText(entry.value),
    })
  }
  weeks.sort((a, b) => Number(a.key.slice(1)) - Number(b.key.slice(1)))

  const date = readDate(get("Date"))

  // The title property is not always named "Task Name", so fall back to
  // whichever property is of type title.
  let name = text("Task Name")
  if (!name) {
    for (const entry of byKey.values()) {
      if ((entry.value as { type?: string })?.type === "title") {
        name = propertyToText(entry.value)
        if (name) break
      }
    }
  }

  return {
    id: page.id,
    url: page.url ?? `https://www.notion.so/${page.id.replace(/-/g, "")}`,
    name: name ?? "Untitled",
    topic: text("Topic"),
    subTopic: text("Sub topic"),
    status: text("status"),
    target: text("26 Target"),
    detail: text("Full Task Detail"),
    reviewGoal: text("Review Goal"),
    businessUnits: propertyToStrings(get("Related BU")),
    dateStart: date.start,
    dateEnd: date.end,
    quarters,
    weeks,
  }
}

function toProgressUpdate(page: { id: string; url?: string; properties?: PropertyBag }): ProgressUpdate {
  const properties = page.properties ?? {}
  const byKey = new Map<string, unknown>()
  for (const [name, value] of Object.entries(properties)) byKey.set(normalizeKey(name), value)

  const get = (name: string) => byKey.get(normalizeKey(name))
  const text = (name: string) => propertyToText(get(name))

  let title = text("Update")
  if (!title) {
    for (const value of byKey.values()) {
      if ((value as { type?: string })?.type === "title") {
        title = propertyToText(value)
        if (title) break
      }
    }
  }

  const checkbox = get("Report to Mgmt") as { type?: string; checkbox?: boolean } | undefined
  const date = readDate(get("Date"))

  return {
    id: page.id,
    url: page.url ?? `https://www.notion.so/${normalizeId(page.id)}`,
    title: title ?? "Untitled update",
    date: date.start,
    period: text("Period"),
    status: text("Status"),
    progress: text("Progress / Result"),
    nextStep: text("Next Step"),
    reportToManagement: checkbox?.checkbox === true,
    taskIds: readRelationIds(get("Task")),
  }
}

/** Progress updates filed against a given task, newest first. */
export function updatesForTask(updates: ProgressUpdate[], taskId: string): ProgressUpdate[] {
  const key = normalizeId(taskId)
  return updates
    .filter((update) => update.taskIds.includes(key))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
}

/** Union of every week column present on any task, newest last. */
export function collectWeekColumns(tasks: Task[]): WeekColumn[] {
  const columns = new Map<string, WeekColumn>()
  for (const task of tasks) {
    for (const week of task.weeks) {
      const existing = columns.get(week.key)
      // Prefer the longest label — a task with an empty cell still carries the
      // full property name, but this guards against truncated variants.
      if (!existing || week.label.length > existing.label.length) {
        columns.set(week.key, { key: week.key, label: week.label, number: Number(week.key.slice(1)) })
      }
    }
  }
  return [...columns.values()].sort((a, b) => a.number - b.number)
}

/* -------------------------------------------------------------------------- */
/* API calls                                                                  */
/* -------------------------------------------------------------------------- */

type FetchOptions = { token: string; version: string; method?: "GET" | "POST"; body?: unknown }

async function notionRequest<T>(path: string, options: FetchOptions): Promise<T> {
  const response = await fetch(`${NOTION_API}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Notion-Version": options.version,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload = (await response.json()) as { message?: string; code?: string }
      detail = payload.message ?? payload.code ?? detail
    } catch {
      // Response was not JSON; keep the status text.
    }
    throw new NotionError(detail, response.status)
  }

  return (await response.json()) as T
}

async function resolveDataSourceId(token: string, databaseId: string): Promise<string> {
  const database = await notionRequest<{ data_sources?: { id: string }[] }>(`/databases/${databaseId}`, {
    token,
    version: DATA_SOURCE_VERSION,
  })
  const first = database.data_sources?.[0]?.id
  if (!first) throw new NotionError("Database exposes no data sources", 404)
  return first
}

type QueryResponse = {
  results: { id: string; url?: string; properties?: PropertyBag }[]
  has_more?: boolean
  next_cursor?: string | null
}

async function queryAllPages(path: string, token: string, version: string) {
  const results: QueryResponse["results"] = []
  let cursor: string | undefined

  // Bounded so a pagination bug can never spin forever; 100 pages × 100 rows
  // is far beyond this tracker's size.
  for (let page = 0; page < 100; page += 1) {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor
    const response = await notionRequest<QueryResponse>(path, { token, version, method: "POST", body })
    results.push(...response.results)
    if (!response.has_more || !response.next_cursor) break
    cursor = response.next_cursor
  }

  return results
}

async function fetchFromNotion(token: string, databaseId: string, dataSourceId?: string) {
  try {
    const sourceId = dataSourceId ?? (await resolveDataSourceId(token, databaseId))
    return await queryAllPages(`/data_sources/${sourceId}/query`, token, DATA_SOURCE_VERSION)
  } catch (error) {
    // Workspaces still on the pre-data-source API reject the calls above with a
    // 400/404. Fall back to the legacy database query before giving up.
    if (error instanceof NotionError && (error.status === 400 || error.status === 404)) {
      return await queryAllPages(`/databases/${databaseId}/query`, token, LEGACY_VERSION)
    }
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/** Seconds the tracker is memoized before Notion is queried again. */
export function revalidateSeconds(): number {
  const raw = Number(process.env.REVALIDATE_SECONDS)
  return Number.isFinite(raw) && raw > 0 ? raw : 300
}

async function loadSample(): Promise<Task[]> {
  const sample = (await import("@/data/sample-tracker.json")).default
  return sample as unknown as Task[]
}

/**
 * The progress log lives in its own database, so a failure there must not take
 * the tracker down with it — an empty log renders as "no updates yet".
 */
async function fetchProgressUpdates(token: string): Promise<ProgressUpdate[]> {
  const databaseId = process.env.NOTION_PROGRESS_DATABASE_ID || DEFAULT_PROGRESS_DATABASE_ID
  try {
    const pages = await fetchFromNotion(token, databaseId)
    return pages
      .map(toProgressUpdate)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  } catch {
    return []
  }
}

async function loadTracker(): Promise<Tracker> {
  const token = process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_DATABASE_ID || DEFAULT_DATABASE_ID
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID

  const fromSample = async (error: string | null): Promise<Tracker> => {
    const tasks = await loadSample()
    return {
      tasks,
      weekColumns: collectWeekColumns(tasks),
      updates: [],
      source: "sample",
      fetchedAt: new Date().toISOString(),
      error,
    }
  }

  if (!token) return fromSample(null)

  try {
    const [pages, updates] = await Promise.all([
      fetchFromNotion(token, databaseId, dataSourceId),
      fetchProgressUpdates(token),
    ])
    const tasks = pages.map(toTask)
    return {
      tasks,
      weekColumns: collectWeekColumns(tasks),
      updates,
      source: "notion",
      fetchedAt: new Date().toISOString(),
      error: null,
    }
  } catch (error) {
    const message =
      error instanceof NotionError
        ? `Notion returned ${error.status}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown error"
    return fromSample(message)
  }
}

/**
 * Notion queries are POSTs, which Next's data cache does not cover, so the
 * result is memoized here instead. A failed live fetch is held only briefly so
 * the dashboard recovers on its own once Notion or the token is fixed.
 */
const ERROR_TTL_MS = 15_000
let memo: { expiresAt: number; value: Tracker } | null = null

/**
 * Returns the tracker for rendering. Falls back to the bundled snapshot when
 * NOTION_TOKEN is absent (local preview) or when Notion errors, so the
 * dashboard degrades to stale-but-visible rather than to a crash.
 */
export async function getTracker(): Promise<Tracker> {
  if (memo && Date.now() < memo.expiresAt) return memo.value

  const value = await loadTracker()
  const ttl = value.error ? ERROR_TTL_MS : revalidateSeconds() * 1000
  memo = { expiresAt: Date.now() + ttl, value }
  return value
}

/** Drops the memo so the next read re-queries Notion. */
export function invalidateTracker(): void {
  memo = null
}

/** Exported for tests. */
export const __internal = { toTask, normalizeKey }
