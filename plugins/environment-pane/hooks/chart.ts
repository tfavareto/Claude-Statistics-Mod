import type { ContextBreakdown } from '../types'
import { formatShare, formatTokens, rowColor, usedRows } from './context'

// Columns of the used context; hovering one shows its figures in a card at the top.
export const CHART_WIDTH = 264
export const CHART_HEIGHT = 186
const CHART_TOP = 56
const CHART_BOTTOM = 42
const COLUMN_MAX_WIDTH = 22
const COLUMN_SHARE = 0.6
const MIN_COLUMN_HEIGHT = 2
const TIP_WIDTH = 150
const TIP_HEIGHT = 46
const TIP_MARGIN = 2
const LABEL_COLOR = '#9A9A9A'
const VALUE_COLOR = '#D0D0D0'
const TIP_BACKGROUND = '#151515'
const TIP_BORDER = '#4A4A4A'
const FONT_FAMILY = 'system-ui, -apple-system, sans-serif'
const SHORT_NAMES: Readonly<Record<string, string>> = {
  'mcp server instructions': 'MCP instr.',
  'custom agents': 'Agents',
  'memory files': 'Memory',
  'system prompt': 'Sys. prompt',
  'system tools': 'Sys. tools',
}

const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Each column's card shows while that column is hovered; nothing else listens.
const hoverStyle = (count: number): string =>
  '<style>' +
  `text{font-family:${FONT_FAMILY};font-size:9px}` +
  '.tip{opacity:0;transition:opacity .12s;pointer-events:none}' +
  '.col{cursor:default}.col:hover .bar{stroke:#FFFFFF;stroke-width:1}' +
  Array.from({ length: count }, (_, index) => `svg:has(.c${index}:hover) .t${index}{opacity:1}`).join('') +
  '</style>'

export const columnChartSvg = (breakdown: ContextBreakdown): string => {
  const rows = usedRows(breakdown)
  const usedTotal = rows.reduce((sum, row) => sum + row.tokens, 0)
  const plotHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM
  const baseline = CHART_TOP + plotHeight
  const largest = Math.max(1, ...rows.map(row => row.tokens))
  const slot = CHART_WIDTH / Math.max(1, rows.length)
  const width = Math.min(COLUMN_MAX_WIDTH, slot * COLUMN_SHARE)

  const columns = rows.map((row, index) => {
    const height = Math.max(MIN_COLUMN_HEIGHT, (row.tokens / largest) * plotHeight)
    const center = index * slot + slot / 2
    const name = escapeXml(SHORT_NAMES[row.name.toLowerCase()] ?? row.name)

    return (
      `<g class="col c${index}">` +
      `<rect x="${(index * slot).toFixed(1)}" y="${CHART_TOP}" width="${slot.toFixed(1)}" height="${CHART_HEIGHT - CHART_TOP}" fill="transparent"/>` +
      `<rect class="bar" x="${(center - width / 2).toFixed(1)}" y="${(baseline - height).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="2" fill="${rowColor(row)}"/>` +
      `<text x="${center.toFixed(1)}" y="${(baseline - height - 3).toFixed(1)}" text-anchor="middle" fill="${VALUE_COLOR}">${formatTokens(row.tokens)}</text>` +
      `<text transform="translate(${(center + 3).toFixed(1)} ${baseline + 10}) rotate(-35)" text-anchor="end" fill="${LABEL_COLOR}">${name}</text></g>`
    )
  })

  const tips = rows.map((row, index) => {
    const center = index * slot + slot / 2
    const x = Math.min(CHART_WIDTH - TIP_WIDTH - TIP_MARGIN, Math.max(TIP_MARGIN, center - TIP_WIDTH / 2))
    const ofUsed = usedTotal > 0 ? `${Math.round((row.tokens / usedTotal) * 100)}% of what is used` : ''

    return (
      `<g class="tip t${index}">` +
      `<rect x="${x.toFixed(1)}" y="${TIP_MARGIN}" width="${TIP_WIDTH}" height="${TIP_HEIGHT}" rx="5" fill="${TIP_BACKGROUND}" stroke="${TIP_BORDER}"/>` +
      `<rect x="${(x + 8).toFixed(1)}" y="${TIP_MARGIN + 8}" width="7" height="7" rx="1.5" fill="${rowColor(row)}"/>` +
      `<text x="${(x + 20).toFixed(1)}" y="${TIP_MARGIN + 15}" fill="#FFFFFF" font-weight="600">${escapeXml(row.name)}</text>` +
      `<text x="${(x + 8).toFixed(1)}" y="${TIP_MARGIN + 29}" fill="${VALUE_COLOR}">${row.tokens.toLocaleString('en-US')} tokens · ${formatShare(row.tokens, breakdown.maxTokens)} of the window</text>` +
      `<text x="${(x + 8).toFixed(1)}" y="${TIP_MARGIN + 41}" fill="${LABEL_COLOR}">${ofUsed}</text></g>`
    )
  })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}">` +
    hoverStyle(rows.length) +
    `<line x1="0" y1="${baseline}" x2="${CHART_WIDTH}" y2="${baseline}" stroke="#FFFFFF" stroke-opacity="0.15"/>` +
    `${columns.join('')}${tips.join('')}</svg>`
  )
}
