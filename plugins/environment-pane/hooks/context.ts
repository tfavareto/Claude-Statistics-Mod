import type { ContextBreakdown, ContextRow } from '../types'

// The desktop app's context card colours, by row; the rest share its grey.
const ROW_COLORS: Readonly<Record<string, string>> = {
  messages: '#3B82F6',
  'mcp tools': '#E8692E',
  'system tools': '#10A37F',
  'system prompt': '#D4A017',
}
const OTHER_COLOR = '#9B9B9B'
const BUFFER_COLOR = '#5C5C5C'
const FREE_COLOR = '#2E2E2E'
const TRACK_COLOR = '#FFFFFF'
const TRACK_OPACITY = 0.08
const SEGMENT_GAP = 1.5

export const BAR_WIDTH = 240
export const BAR_HEIGHT = 6

export const rowColor = (row: ContextRow): string => {
  if (row.kind === 'free') return FREE_COLOR
  if (row.kind === 'buffer' || row.kind === 'deferred') return BUFFER_COLOR

  return ROW_COLORS[row.name.toLowerCase()] ?? OTHER_COLOR
}

// 414_200 → "414.2k", 33_000 → "33k", 1_000_000 → "1M"
export const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M`
  if (tokens >= 1_000) return `${Number((tokens / 1_000).toFixed(1))}k`

  return String(tokens)
}

export const formatShare = (tokens: number, maxTokens: number): string =>
  maxTokens > 0 ? `${((tokens / maxTokens) * 100).toFixed(1)}%` : '—'

// The used rows in order, then the compaction buffer, over a faint track.
export const segmentedBarSvg = (breakdown: ContextBreakdown): string => {
  const shown = breakdown.rows.filter(row => (row.kind === 'used' || row.kind === 'buffer') && row.tokens > 0)
  const radius = BAR_HEIGHT / 2
  let x = 0
  const segments = shown.map(row => {
    const width = breakdown.maxTokens > 0 ? (row.tokens / breakdown.maxTokens) * BAR_WIDTH : 0
    const segment = `<rect x="${x.toFixed(1)}" width="${Math.max(0, width - SEGMENT_GAP).toFixed(1)}" height="${BAR_HEIGHT}" fill="${rowColor(row)}"/>`
    x += width

    return segment
  })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" viewBox="0 0 ${BAR_WIDTH} ${BAR_HEIGHT}">` +
    `<defs><clipPath id="bar"><rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${radius}"/></clipPath></defs>` +
    `<g clip-path="url(#bar)"><rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" fill="${TRACK_COLOR}" fill-opacity="${TRACK_OPACITY}"/>` +
    `${segments.join('')}</g></svg>`
  )
}

export const usedRows = (breakdown: ContextBreakdown): ContextRow[] =>
  breakdown.rows.filter(row => row.kind === 'used' && row.tokens > 0)

export const rowsOfKind = (breakdown: ContextBreakdown, kind: ContextRow['kind']): ContextRow[] =>
  breakdown.rows.filter(row => row.kind === kind && row.tokens > 0)
