import type { UsageWindow } from '../types'
import type { Words } from './words'

// Straight-line pace, as the app's usage card estimates it: what was used since
// the window opened, carried forward at the same rate until it reaches 100%.
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WINDOW_MS = { session: 5 * HOUR_MS, week: 7 * DAY_MS } as const
// Too early in a window the rate says nothing yet.
const MIN_ELAPSED_SHARE = 0.05

type Projection = { kind: UsageWindow['kind']; runsOutAt: number; resetsAt: number }

export const formatRemaining = (ms: number, words: Words): string => {
  if (ms <= 0) return words.now

  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}`

  return `${minutes}min`
}

// undefined: no estimate yet; Infinity: the window lasts until it renews.
const runsOutAt = (window: UsageWindow, now: number): number | undefined => {
  if (window.resetsAt === undefined) return undefined

  const resetsAt = Date.parse(window.resetsAt)
  const length = WINDOW_MS[window.kind]
  const elapsed = now - (resetsAt - length)
  if (elapsed < length * MIN_ELAPSED_SHARE || window.percentUsed <= 0) return undefined
  if (window.percentUsed >= 100) return now

  const at = now + ((100 - window.percentUsed) / window.percentUsed) * elapsed

  return at < resetsAt ? at : Infinity
}

const startOfDay = (at: number): number => {
  const date = new Date(at)

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const clock = (at: number): string => {
  const date = new Date(at)

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const sentence = ({ kind, runsOutAt: at, resetsAt }: Projection, now: number, words: Words): string => {
  if (kind === 'session') return words.sessionRunsOut(clock(at), clock(resetsAt))

  const date = new Date(at)
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY_MS)

  return words.weekRunsOut(words.when(days, date.getDay(), date.getHours()), words.weekday(new Date(resetsAt).getDay()))
}

export const paceText = (windows: readonly UsageWindow[], now: number, words: Words): string | undefined => {
  const estimates = windows.flatMap(window => {
    const at = runsOutAt(window, now)

    return at === undefined || window.resetsAt === undefined
      ? []
      : [{ kind: window.kind, runsOutAt: at, resetsAt: Date.parse(window.resetsAt) }]
  })
  if (estimates.length === 0) return undefined

  const short = estimates.filter(estimate => estimate.runsOutAt !== Infinity)
  if (short.length === 0) return words.lasts

  return words.pace(short.map(estimate => sentence(estimate, now, words)))
}
