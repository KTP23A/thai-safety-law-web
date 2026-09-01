import type { StatusTone } from "@/lib/notion"

/** CSS custom-property names per tone, so colours live in one place (globals.css). */
export const toneVar: Record<StatusTone, string> = {
  done: "var(--tone-done)",
  ontrack: "var(--tone-ontrack)",
  delayed: "var(--tone-delayed)",
  atrisk: "var(--tone-atrisk)",
  tbd: "var(--tone-tbd)",
  none: "var(--tone-none)",
}

export const toneBgVar: Record<StatusTone, string> = {
  done: "var(--tone-done-bg)",
  ontrack: "var(--tone-ontrack-bg)",
  delayed: "var(--tone-delayed-bg)",
  atrisk: "var(--tone-atrisk-bg)",
  tbd: "var(--tone-tbd-bg)",
  none: "var(--tone-none-bg)",
}
