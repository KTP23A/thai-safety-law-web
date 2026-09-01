import { PageShell } from "@/components/PageShell"
import { StatusPill } from "@/components/StatusPill"
import { DEFAULT_PROGRESS_DATABASE_ID, getTracker, normalizeId, type ProgressUpdate } from "@/lib/notion"
import { formatDateRange } from "@/lib/stats"

export const dynamic = "force-dynamic"

const PROGRESS_LOG_URL = `https://www.notion.so/${DEFAULT_PROGRESS_DATABASE_ID}`

function UpdateEntry({ update, taskNames }: { update: ProgressUpdate; taskNames: string[] }) {
  return (
    <div className="update">
      <div className="update-head">
        <strong>{update.title}</strong>
        {update.status ? <StatusPill status={update.status} /> : null}
        {update.period ? <span className="tag">{update.period}</span> : null}
        {update.reportToManagement ? <span className="tag">Report to mgmt</span> : null}
        <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
          {formatDateRange(update.date, null) ?? "No date"}
        </span>
      </div>
      <dl>
        {taskNames.length > 0 ? (
          <>
            <dt>Task</dt>
            <dd>{taskNames.join(", ")}</dd>
          </>
        ) : null}
        {update.progress ? (
          <>
            <dt>Progress</dt>
            <dd>{update.progress}</dd>
          </>
        ) : null}
        {update.nextStep ? (
          <>
            <dt>Next step</dt>
            <dd>{update.nextStep}</dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}

export default async function UpdatesPage() {
  const tracker = await getTracker()
  const { updates, tasks } = tracker

  const nameById = new Map(tasks.map((task) => [normalizeId(task.id), task.name]))
  const namesFor = (update: ProgressUpdate) =>
    update.taskIds.map((id) => nameById.get(id)).filter((name): name is string => Boolean(name))

  return (
    <PageShell
      tracker={tracker}
      title="Updates"
      subtitle={updates.length > 0 ? `${updates.length} entries in the progress log` : "Progress log is empty"}
    >
      {updates.length === 0 ? (
        <div className="card">
          <div className="card-head">
            <h2>Progress log</h2>
            <span>Nothing logged yet</span>
          </div>
          <div className="card-body">
            <p style={{ marginTop: 0 }}>
              The <strong>📈 Progress Log 2026</strong> database is set up — Update, Date, Period, Status, Progress /
              Result, Next Step, Report to Mgmt, and a relation back to each task — but no entries have been written yet.
            </p>
            <p style={{ marginBottom: 0 }}>
              Add a row there and it will appear here, grouped by date and linked to its task.{" "}
              <a href={PROGRESS_LOG_URL} target="_blank" rel="noreferrer">
                Open the progress log ↗
              </a>
            </p>
          </div>
        </div>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>Progress log</h2>
            <span>Newest first</span>
          </div>
          <div>
            {updates.map((update) => (
              <UpdateEntry key={update.id} update={update} taskNames={namesFor(update)} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
