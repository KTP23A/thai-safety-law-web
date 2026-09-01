import { statusTone, TONE_LABEL } from "@/lib/notion"
import { toneBgVar, toneVar } from "@/components/tone"

/**
 * Renders a status option. The raw Notion label is shown when present so the
 * emoji the team recognises survives; the colour comes from the parsed tone.
 */
export function StatusPill({ status, fallback = true }: { status: string | null; fallback?: boolean }) {
  const tone = statusTone(status)
  if (!status && !fallback) return <span className="muted">—</span>
  return (
    <span className="pill" style={{ background: toneBgVar[tone], color: toneVar[tone] }}>
      {status ?? TONE_LABEL[tone]}
    </span>
  )
}
