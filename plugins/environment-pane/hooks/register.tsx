import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpToolResult, Register, SessionContextBreakdown } from 'claude-code'

import type { Activity, ContextBreakdown, RemoteState, Touch, TreeRow } from '../types'
import { ACTIVITY_LABEL, FILE_VERB, activityOfTool, folderName } from './activity'
import { CHART_HEIGHT, CHART_WIDTH, columnChartSvg } from './chart'
import { MINI_HEIGHT, MINI_WIDTH, SCENE_HEIGHT, SCENE_WIDTH, clawdScene, miniClawd } from './clawd'
import { connectorServer, readServers } from './connectors'
import { BAR_HEIGHT, BAR_WIDTH, formatShare, formatTokens, rowsOfKind, segmentedBarSvg, usedRows } from './context'
import { LOGO_SIZE, logoSvg } from './logos'
import { isInside, pathOfCall, readTree } from './tree'

const PANE = 'environment'
const COMMAND = 'environment'
const SESSIONS_SERVER = 'ccd_session_mgmt'
const VIEW_SERVER = 'ccd_view'
const SVG_SURFACES: readonly string[] = ['desktop', 'mobile']
const WORKING_COLOR = '#FF8A1F'
const POLL_MS = 5_000
const SLOW_REFRESH_EVERY_POLLS = 12
const SCENE_SCALE = 0.75
const INDENT = 2
const REMOTE_STATES: readonly RemoteState[] = ['on', 'off', 'connecting', 'unavailable']

const breakdown = atom({ plugin: 'environment-pane', key: 'breakdown' } as const, null)
const connectors = atom({ plugin: 'environment-pane', key: 'connectors' } as const, [])
const servers = atom({ plugin: 'environment-pane', key: 'servers' } as const, [])
const remote = atom({ plugin: 'environment-pane', key: 'remote' } as const, 'unknown')
const isSwitchingRemote = atom({ plugin: 'environment-pane', key: 'isSwitchingRemote' } as const, false)
const activity = atom({ plugin: 'environment-pane', key: 'activity' } as const, 'idle')
const activePath = atom({ plugin: 'environment-pane', key: 'activePath' } as const, null)
const tree = atom({ plugin: 'environment-pane', key: 'tree' } as const, [])
const expanded = atom({ plugin: 'environment-pane', key: 'expanded' } as const, [])
const collapsed = atom({ plugin: 'environment-pane', key: 'collapsed' } as const, [])
const touched = atom({ plugin: 'environment-pane', key: 'touched' } as const, {})

let root = ''
let polls = 0
let hasWarned = false

const textOf = (result: McpToolResult): string =>
  result.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

const remoteStateOf = (text: string): RemoteState =>
  REMOTE_STATES.find(state => new RegExp(`\\b${state}\\b`).test(text)) ?? 'unknown'

const compactBreakdown = (full: SessionContextBreakdown): ContextBreakdown => ({
  totalTokens: full.totalTokens,
  maxTokens: full.rawMaxTokens,
  percentage: full.percentage,
  rows: full.categories.map(({ name, tokens, kind }) => ({ name, tokens, kind })),
})

// The folder the small Claude sits in: the active folder, or the one holding the active file.
const workingFolder = (rows: readonly TreeRow[], active: string | null): string | undefined => {
  if (active === null) return undefined

  const row = rows.find(one => one.path === active)

  return row?.isDir ? row.path : active.slice(0, active.lastIndexOf('/'))
}

function warnOnce($: EngineInterface, what: string, error: unknown): void {
  if (hasWarned) return

  hasWarned = true
  $.ui.log(`environment-pane: could not ${what} (${String(error)})`)
}

async function refreshTree($: EngineInterface): Promise<void> {
  if (root === '') return

  const view = {
    active: (await read($, activePath)) ?? undefined,
    expanded: await read($, expanded),
    collapsed: await read($, collapsed),
    touched: await read($, touched),
  }
  const rows = await readTree($, root, view)
  await update($, tree, () => rows)
}

async function refreshSlow($: EngineInterface): Promise<void> {
  try {
    const rows = await readServers($)
    await update($, servers, () => rows)
    const session = await $.mcp.call(SESSIONS_SERVER, 'get_session', { session_id: 'self' })
    if (!session.isError) {
      const state = remoteStateOf(String(JSON.parse(textOf(session)).remoteControlState ?? ''))
      await update($, remote, () => state)
    }
  } catch (error) {
    warnOnce($, 'read the connectors', error)
  }
}

async function poll($: EngineInterface): Promise<void> {
  polls += 1
  await refreshTree($)
  if (polls % SLOW_REFRESH_EVERY_POLLS === 0) await refreshSlow($)
}

// An edit outranks a read: a file once edited stays marked as edited.
const touchOf = (next: Activity, before: Touch | undefined): Touch =>
  next === 'coding' || before === 'edited' ? 'edited' : 'read'

async function setActivity($: EngineInterface, next: Activity, path?: string): Promise<void> {
  await update($, activity, () => next)
  if (path === undefined) return

  if (root !== '' && isInside(root, path)) {
    await update($, touched, marks => ({ ...marks, [path]: touchOf(next, marks[path]) }))
  }
  await update($, activePath, () => path)
  await refreshTree($)
}

// A press on a folder opens or closes it, whatever Claude is doing.
async function toggleFolder($: EngineInterface, path: string, isOpen: boolean): Promise<void> {
  await update($, expanded, list => (isOpen ? list.filter(one => one !== path) : [...list.filter(one => one !== path), path]))
  await update($, collapsed, list => (isOpen ? [...list.filter(one => one !== path), path] : list.filter(one => one !== path)))
  await refreshTree($)
}

async function openFile($: EngineInterface, path: string): Promise<void> {
  const result = await $.mcp.call(VIEW_SERVER, 'show_pane', { pane: 'file', path }).catch(error => {
    $.ui.toast(`Could not open ${path} (${String(error)})`)
    return undefined
  })
  if (result?.isError) $.ui.toast(textOf(result))
}

// `summary` estimates locally from the last response, so it costs no request.
async function measureContext($: EngineInterface): Promise<void> {
  const { context } = await $.session.usage({ breakdown: 'summary' })
  if (context.breakdown === undefined) return

  const next = compactBreakdown(context.breakdown)
  await update($, breakdown, () => next)
}

async function toggleRemote($: EngineInterface): Promise<void> {
  if (await read($, isSwitchingRemote)) return

  await update($, isSwitchingRemote, () => true)
  try {
    const isOn = (await read($, remote)) === 'on'
    const result = await $.mcp.call(SESSIONS_SERVER, 'set_remote_control', { session_id: 'self', enabled: !isOn })
    if (result.isError) throw new Error(textOf(result))

    const state = remoteStateOf(textOf(result))
    await update($, remote, () => state)
  } catch (error) {
    $.ui.toast(`Remote Control: ${String(error)}`)
  } finally {
    await update($, isSwitchingRemote, () => false)
  }
}

async function openPane($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PANE, title: 'Environment' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    root = e.cwd
    await $.command.register({ name: COMMAND, description: 'Open the Environment pane beside the chat' })
    await update($, activity, () => 'idle')
    await refreshSlow($)
    await measureContext($)
    await refreshTree($)
    $.clock.every(POLL_MS, () => poll($))
    void openPane($)

    return started
  })

  on('command.run', { command: COMMAND }, async $ => {
    await openPane($)

    return { text: 'Environment pane opened.' }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await setActivity($, 'thinking')

    return next(e)
  })

  // Subagents' calls count too: they work in the same folder.
  on('tool.call', async ($, e, next) => {
    const server = connectorServer(e.tool)
    if (server !== undefined) {
      await update($, connectors, list => (list.includes(server) ? list : [...list, server]))
    }
    await setActivity($, activityOfTool(e.tool), pathOfCall(e as unknown as Record<string, unknown>))
    const called = await next(e)
    await setActivity($, 'thinking')

    return called
  })

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)
    if (e.agentId === undefined) await setActivity($, 'idle')

    return completed
  })

  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    if (e.changed.includes('context')) await measureContext($)

    return measured
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    const Svg = SVG_SURFACES.includes(e.surface) && 'Svg' in elements ? elements.Svg : undefined
    const doing = await read($, activity)
    const active = await read($, activePath)
    const rows = await read($, tree)
    const context = await read($, breakdown)
    const used = await read($, connectors)
    const serverRows = await read($, servers)
    const remoteState = await read($, remote)
    const isSwitching = await read($, isSwitchingRemote)
    const isBusy = doing !== 'idle'
    const folderOfWork = workingFolder(rows, active)
    const isOutside = active !== null && root !== '' && !isInside(root, active)
    const connected = serverRows.filter(row => row.status === 'connected')
    const needsSignIn = serverRows.filter(row => row.status === 'needs_auth').length
    const failed = serverRows.filter(row => row.status === 'failed').length

    return (
      <Box flexDirection="column" rowGap={2} paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box flexDirection="column">
            <Text weight="semibold">Remote Control</Text>
            <Text dimColor>{isSwitching ? 'Switching…' : remoteState === 'unknown' ? 'State unknown' : remoteState}</Text>
          </Box>
          {remoteState !== 'unavailable' && (
            <Button
              key="remote"
              label={remoteState === 'on' ? 'Turn off' : 'Turn on'}
              variant={remoteState === 'on' ? 'secondary' : 'primary'}
              onPress={() => toggleRemote($)}
            />
          )}
        </Box>

        <Box flexDirection="column" rowGap={1}>
          <Text weight="semibold">Folders</Text>
          <Box flexDirection="row" columnGap={2} alignItems="center">
            {Svg && (
              <Svg
                source={clawdScene(doing)}
                alt={`Claude: ${ACTIVITY_LABEL[doing]}`}
                width={Math.round(SCENE_WIDTH * SCENE_SCALE)}
                height={Math.round(SCENE_HEIGHT * SCENE_SCALE)}
                isInteractive
              />
            )}
            <Box flexDirection="column">
              <Text weight="semibold">{folderName(root)}</Text>
              <Text color={isBusy ? WORKING_COLOR : 'subtle'} italic>
                {ACTIVITY_LABEL[doing]}
                {isBusy ? '…' : ''}
              </Text>
            </Box>
          </Box>
          {isOutside && <Text dimColor>Outside the project: {active}</Text>}
          <Box flexDirection="column">
            {rows.map(row => {
              const isWorkingHere = row.path === folderOfWork
              const isLit = isBusy && (row.isActive || row.holdsActive || isWorkingHere)
              const isMore = row.path.endsWith('/…')
              const mark = row.touched === 'edited' ? '●' : row.touched === 'read' ? '○' : ' '

              return (
                <Box key={row.path} flexDirection="row" columnGap={1} alignItems="center" paddingLeft={row.depth * INDENT}>
                  {isMore ? (
                    <Text dimColor>{row.name}</Text>
                  ) : (
                    <Button
                      key={`open:${row.path}`}
                      plain
                      onPress={() => (row.isDir ? toggleFolder($, row.path, row.isOpen) : openFile($, row.path))}
                    >
                      <Text dimColor>{row.isDir ? (row.isOpen ? '▾' : '▸') : mark} </Text>
                      <Text
                        color={isLit ? WORKING_COLOR : row.touched === 'edited' ? WORKING_COLOR : undefined}
                        dimColor={!row.isDir && !row.isActive && row.touched === undefined}
                        weight={row.isActive || isWorkingHere ? 'semibold' : 'regular'}
                      >
                        {row.name}
                      </Text>
                      {row.isDir && row.touchedCount > 0 && <Text dimColor> · {row.touchedCount}</Text>}
                    </Button>
                  )}
                  {isWorkingHere &&
                    (Svg ? (
                      <Svg source={miniClawd(doing)} alt={`Claude: ${ACTIVITY_LABEL[doing]} here`} width={MINI_WIDTH} height={MINI_HEIGHT} isInteractive />
                    ) : (
                      <Text color={WORKING_COLOR}>✻</Text>
                    ))}
                  {row.isActive && !row.isDir && (
                    <Text dimColor italic>
                      {FILE_VERB[doing]}
                    </Text>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {context !== null && (
          <Box flexDirection="column" rowGap={1}>
            <Text weight="semibold">Context</Text>
            <Box flexDirection="row" justifyContent="space-between">
              <Text>{context.percentage}% used</Text>
              <Text dimColor tabular>
                {formatTokens(context.totalTokens)} / {formatTokens(context.maxTokens)}
              </Text>
            </Box>
            {Svg && (
              <Svg source={segmentedBarSvg(context)} alt={`Context ${context.percentage}% used`} width={BAR_WIDTH} height={BAR_HEIGHT} />
            )}
            {Svg ? (
              <Svg source={columnChartSvg(context)} alt="Context used by category" width={CHART_WIDTH} height={CHART_HEIGHT} isInteractive />
            ) : (
              usedRows(context).map(row => (
                <Text dimColor>
                  {row.name} {formatTokens(row.tokens)} {formatShare(row.tokens, context.maxTokens)}
                </Text>
              ))
            )}
            {[...rowsOfKind(context, 'free'), ...rowsOfKind(context, 'buffer')].map(row => (
              <Text dimColor>
                {row.name} {formatTokens(row.tokens)} · {formatShare(row.tokens, context.maxTokens)}
              </Text>
            ))}
            {rowsOfKind(context, 'deferred').length > 0 && (
              <Text dimColor>
                Deferred: {rowsOfKind(context, 'deferred').map(row => `${row.name.replace(/ \(deferred\)$/, '')} ${formatTokens(row.tokens)}`).join(', ')}
              </Text>
            )}
          </Box>
        )}

        <Box flexDirection="column" rowGap={1}>
          <Text weight="semibold">Connectors</Text>
          {connected.length === 0 && <Text dimColor>Nothing connected.</Text>}
          {connected.map(row => (
            <Box key={row.key} flexDirection="row" justifyContent="space-between" columnGap={2}>
              <Box flexDirection="row" columnGap={1} alignItems="center">
                {Svg ? (
                  <Svg source={logoSvg(row.name)} alt={row.name} width={LOGO_SIZE} height={LOGO_SIZE} />
                ) : (
                  <Text>●</Text>
                )}
                <Text color={used.includes(row.key) ? WORKING_COLOR : undefined}>{row.name}</Text>
              </Box>
              <Text dimColor tabular>
                {used.includes(row.key) ? 'used · ' : ''}
                {row.toolCount ?? 0} tools
              </Text>
            </Box>
          ))}
          {needsSignIn + failed > 0 && (
            <Text dimColor>
              {[needsSignIn > 0 ? `${needsSignIn} need sign-in` : '', failed > 0 ? `${failed} failed` : ''].filter(Boolean).join(' · ')}
            </Text>
          )}
        </Box>
      </Box>
    )
  })
}
