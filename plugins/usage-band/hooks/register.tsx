import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpToolResult, Register } from 'claude-code'

import type { PlanUsage, UsageWindow } from '../types'
import { barCells, barSize, barSvg } from './bar'
import { formatRemaining, paceText } from './pace'
import { wordsFor } from './words'
import type { Words } from './words'

const plan = atom({ plugin: 'usage-band', key: 'plan' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const SESSIONS_SERVER = 'ccd_session_mgmt'
const TICK_MS = 60_000
const REFRESH_EVERY_TICKS = 5
const MIN_REFRESH_MS = 30_000
const SVG_SURFACES: readonly string[] = ['desktop', 'mobile']
// The theme's text color: white on the dark theme.
const TEXT_COLOR = 'text'

// The app's usage card names its windows in English; the engine by kind.
const WINDOWS = [
  { kind: 'session', cardLabel: /5-hour/i, engineKind: 'five_hour' },
  { kind: 'week', cardLabel: /weekly.*all models/i, engineKind: 'seven_day' },
] as const

type CardWindow = { label: string; percentUsed: number; resetsAt?: string }

let ticks = 0
let words: Words = wordsFor('en')

const textOf = (result: McpToolResult): string =>
  result.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

async function fromCard($: EngineInterface): Promise<UsageWindow[]> {
  const result = await $.mcp.call(SESSIONS_SERVER, 'get_usage', {})
  if (result.isError) throw new Error(textOf(result))

  const card = JSON.parse(textOf(result)).plan
  if (card?.status !== 'ok') return []

  const cards: CardWindow[] = card.windows ?? []

  return WINDOWS.flatMap(({ kind, cardLabel }) => {
    const found = cards.find(window => cardLabel.test(window.label))

    return found ? [{ kind, label: words[kind], percentUsed: found.percentUsed, resetsAt: found.resetsAt }] : []
  })
}

// Off the desktop app the card is not there: the engine's last reading stands in.
async function fromEngine($: EngineInterface): Promise<UsageWindow[]> {
  const { rateLimits } = await $.session.usage()

  return WINDOWS.flatMap(({ kind, engineKind }) => {
    const limit = rateLimits.find(window => window.kind === engineKind)

    return limit ? [{ kind, label: words[kind], percentUsed: limit.percentUsed, resetsAt: limit.resetsAt }] : []
  })
}

async function readWindows($: EngineInterface): Promise<UsageWindow[]> {
  try {
    const windows = await fromCard($)
    if (windows.length > 0) return windows
  } catch {
    // The card is the desktop app's; the engine's reading follows.
  }

  return fromEngine($)
}

async function refresh($: EngineInterface, isForced: boolean): Promise<void> {
  const at = await $.clock.now()
  const last = await read($, plan)
  if (!isForced && last !== null && at - last.fetchedAt < MIN_REFRESH_MS) return

  try {
    const windows = await readWindows($)
    const next: PlanUsage = { windows, fetchedAt: at }

    await update($, plan, () => next)
    await update($, now, () => at)
  } catch (error) {
    $.ui.log(`usage-band: could not read the plan's usage (${String(error)})`)
  }
}

async function tick($: EngineInterface): Promise<void> {
  ticks += 1
  if (ticks % REFRESH_EVERY_TICKS === 0) {
    await refresh($, true)
    return
  }

  const at = await $.clock.now()
  await update($, now, () => at)
}

const resetText = (window: UsageWindow, at: number): string =>
  window.resetsAt === undefined ? '' : words.resetsIn(formatRemaining(Date.parse(window.resetsAt) - at, words))

export const register: Register = (on, options) => {
  words = wordsFor(options.language)

  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await refresh($, true)
    $.clock.every(TICK_MS, () => tick($))

    return started
  })

  // After each turn, and when a window moves a whole point.
  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    await refresh($, false)

    return measured
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, plan)
    if (e.props.hasSurvey || current === null || current.windows.length === 0) return next(e)

    const at = Math.max(await read($, now), current.fetchedAt)
    const pace = paceText(current.windows, at, words)
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const Svg = SVG_SURFACES.includes(e.surface) && 'Svg' in elements ? elements.Svg : undefined

    return (
      <Box flexDirection="column" rowGap={1}>
        <Box flexDirection="row" flexWrap="nowrap" columnGap={3}>
          {current.windows.map(window => {
            const cells = barCells(window.percentUsed)

            return (
              <Box key={window.kind} flexDirection="row" columnGap={1} alignItems="center">
                <Text color={TEXT_COLOR} weight="semibold">
                  {window.label}
                </Text>
                {Svg ? (
                  <Svg
                    source={barSvg(window.percentUsed)}
                    alt={words.usedAlt(window.label, Math.round(window.percentUsed))}
                    width={barSize.width}
                    height={barSize.height}
                  />
                ) : (
                  <Box flexDirection="row">
                    <Text color={TEXT_COLOR}>{cells.filled}</Text>
                    <Text color="subtle">{cells.empty}</Text>
                  </Box>
                )}
                <Text color={TEXT_COLOR} weight="semibold">
                  {Math.round(window.percentUsed)}%
                </Text>
                <Text dimColor>{resetText(window, at)}</Text>
              </Box>
            )
          })}
        </Box>
        {pace !== undefined && (
          <Text dimColor italic>
            {pace}
          </Text>
        )}
      </Box>
    )
  })
}
