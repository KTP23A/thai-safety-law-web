import { TONE_LABEL, TONE_ORDER } from "@/lib/notion"
import type { ToneCounts } from "@/lib/stats"
import { toneVar } from "@/components/tone"

export function StackedBar({ counts, legend = false }: { counts: ToneCounts; legend?: boolean }) {
  const total = TONE_ORDER.reduce((sum, tone) => sum + counts[tone], 0)
  if (total === 0) return <div className="bar" />

  return (
    <>
      <div className="bar" role="img" aria-label={TONE_ORDER.filter((tone) => counts[tone] > 0).map((tone) => `${TONE_LABEL[tone]}: ${counts[tone]}`).join(", ")}>
        {TONE_ORDER.filter((tone) => counts[tone] > 0).map((tone) => (
          <span
            key={tone}
            style={{ width: `${(counts[tone] / total) * 100}%`, background: toneVar[tone] }}
            title={`${TONE_LABEL[tone]}: ${counts[tone]}`}
          />
        ))}
      </div>
      {legend ? (
        <div className="bar-legend">
          {TONE_ORDER.filter((tone) => counts[tone] > 0).map((tone) => (
            <span key={tone}>
              <i style={{ background: toneVar[tone] }} />
              {TONE_LABEL[tone]} · {counts[tone]}
            </span>
          ))}
        </div>
      ) : null}
    </>
  )
}
