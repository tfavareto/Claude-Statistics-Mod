import type { On, SessionContextBreakdown } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { activityOfTool } from './activity'

// Mounting runs the engine; a busy machine needs more than the default 5 s.
const UI_TEST = { timeoutMs: 20_000 }
const ROOT = '/Users/someone/code/demo-app'
const BANK = '00000000-0000-4000-8000-000000000001'

// The project as the pane lists it: folders, files and what it leaves out.
const DISK: Readonly<Record<string, readonly [string, 'dir' | 'file'][]>> = {
  [ROOT]: [['README.md', 'file'], ['src', 'dir'], ['.git', 'dir'], ['docs', 'dir']],
  [`${ROOT}/src`]: [['app.ts', 'file'], ['lib', 'dir']],
  [`${ROOT}/src/lib`]: [['util.ts', 'file']],
  [`${ROOT}/docs`]: [['guide.md', 'file']],
}

// The desktop card's figures, as `/context` breaks the window down.
const BREAKDOWN: SessionContextBreakdown = {
  categories: [
    { name: 'Messages', tokens: 336_600, color: 'promptBorder', isDeferred: false, kind: 'used' },
    { name: 'MCP tools', tokens: 21_600, color: 'warning', isDeferred: false, kind: 'used' },
    { name: 'Free space', tokens: 552_500, color: 'inactive', isDeferred: false, kind: 'free' },
    { name: 'Autocompact buffer', tokens: 33_000, color: 'inactive', isDeferred: false, kind: 'buffer' },
    { name: 'MCP tools (deferred)', tokens: 246_400, color: 'inactive', isDeferred: true, kind: 'deferred' },
  ],
  totalTokens: 414_200,
  maxTokens: 1_000_000,
  rawMaxTokens: 1_000_000,
  autocompactSource: 'env',
  percentage: 41,
  gridRows: [],
  model: 'claude-opus-5-5',
  memoryFiles: [],
  mcpTools: [],
  agents: [],
  isAutoCompactEnabled: true,
  apiUsage: null,
}

const SERVERS = [
  { name: 'API - Banco Open Finance (Banco MCP)', id: BANK, kind: 'connector', status: 'connected', tool_count: 26 },
  { name: 'plugin:ecc:chrome-devtools', kind: 'plugin', status: 'connected', tool_count: 32 },
  { name: 'plugin:financial-analysis:box', kind: 'plugin', status: 'needs_auth' },
  { name: 'plugin:financial-analysis:mtnewswire', kind: 'plugin', status: 'failed' },
]

const PANE = {
  plugin: 'environment-pane',
  component: 'Pane',
  requestId: 'environment',
  props: {
    title: 'Environment',
    isFocused: false,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  },
} as const

const text = (value: unknown) => ({ value: { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false } })

type World = { remoteCalls: unknown[]; opened: unknown[] }

const start = async ($: Engine, on: On): Promise<World> => {
  const world: World = { remoteCalls: [], opened: [] }
  let remote = 'off'
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'environment' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 414_200, window: 1_000_000, percent: 41, breakdown: BREAKDOWN }, rateLimits: [] },
  }))
  on('mcp.call', (_, e) => {
    if (e.tool === 'session_connectors_status') return text({ servers: SERVERS })
    if (e.tool === 'show_pane') {
      world.opened.push(e.args)
      return text({ shown: true })
    }
    if (e.tool === 'set_remote_control') {
      world.remoteCalls.push(e.args)
      remote = e.args.enabled ? 'on' : 'off'
      return text({ remoteControlState: remote })
    }
    return text({ sessionId: 'local_self', remoteControlState: remote })
  })
  on('fs.list', (_, e) => ({
    value: (DISK[e.path] ?? []).map(([name, kind]) => ({ name, kind, size: 1, mtimeMs: 0, isLink: false })),
  }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true })

  return world
}

const texts = async (ui: { findAll: (query: { type: string }) => Promise<{ text: string }[]> }) =>
  (await ui.findAll({ type: 'Text' })).map(found => found.text)

test('the tree lists the project, folders first, without version control', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)

  // Act
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const shown = await texts(ui)

  // Assert
  expect(shown.filter(line => ['docs', 'src', 'README.md', '.git'].includes(line))).toEqual(['docs', 'src', 'README.md'])
  expect(shown).toContain('demo-app')
  expect(shown).toContain('Idle')
  expect(shown.indexOf('Remote Control')).toBeLessThan(shown.indexOf('Folders'))
  await ui.unmount()
})

test('Claude shows in the folder of the file it edits, and stays there after', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)

  // Act
  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/lib/util.ts`, old_string: 'a', new_string: 'b' } as any)
  const between = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const thinking = await texts(between)
  await between.unmount()
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const after = await texts(ui)
  const mini = (await ui.findAll({ type: 'Svg' })).filter(found => String(found.props.alt).endsWith('here'))

  // Assert
  expect(thinking).toEqual(expect.arrayContaining(['Thinking…', 'util.ts', 'last touched']))
  expect(after).toEqual(expect.arrayContaining(['src', 'lib', 'util.ts', 'app.ts', 'Idle', 'last touched']))
  expect(after).not.toContain('guide.md')
  expect(mini).toHaveLength(1)
  await ui.unmount()
})

test('a file outside the project is named apart', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)

  // Act
  await $.tool.call({ tool: 'Read', file_path: '/tmp/notes.txt' } as any)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /Outside/ }))?.text).toBe('Outside the project: /tmp/notes.txt')
  await ui.unmount()
})

test('the context chart carries a hover card per column', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)

  // Act
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const chart = (await ui.findAll({ type: 'Svg' })).find(found => found.props.alt === 'Context used by category')
  const source = String(chart?.props.source)

  // Assert
  expect((await ui.find({ type: 'Text', text: /used$/ }))?.text).toBe('41% used')
  expect(chart?.props.isInteractive).toBe(true)
  expect(source).toContain('svg:has(.c0:hover) .t0{opacity:1}')
  expect(source).toContain('336,600 tokens · 33.7% of the window')
  expect(source).toContain('94% of what is used')
  await ui.unmount()
})

test('the connectors list what is connected and mark what this chat used', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)

  // Act
  await $.tool.call({ tool: `mcp__${BANK}__connect` } as any)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /^used/ }))?.text).toBe('used · 26 tools')
  expect((await ui.find({ type: 'Text', text: /chrome-devtools/ }))?.text).toBe('chrome-devtools')
  const logos = (await ui.findAll({ type: 'Svg' })).map(found => String(found.props.alt))
  expect(logos).toEqual(expect.arrayContaining(['API - Banco Open Finance (Banco MCP)', 'chrome-devtools']))
  expect((await ui.find({ type: 'Text', text: /sign-in/ }))?.text).toBe('1 need sign-in · 1 failed')
  await ui.unmount()
})

test('the Remote Control button turns it on', UI_TEST, async ($, on) => {
  // Arrange
  const world = await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  // Act
  await ui.press({ key: 'remote' })

  // Assert
  expect(world.remoteCalls).toEqual([{ session_id: 'self', enabled: true }])
  expect((await ui.find({ type: 'Button', key: 'remote' }))?.props.label).toBe('Turn off')
  await ui.unmount()
})

test('each tool sets the pose', () => {
  // Arrange
  const tools = ['Edit', 'Write', 'Bash', 'Read', 'Grep', 'Agent']

  // Act
  const poses = tools.map(activityOfTool)

  // Assert
  expect(poses).toEqual(['coding', 'coding', 'running', 'reviewing', 'reviewing', 'thinking'])
})

test('folders open and close on a press, whether Claude works or not', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  // Act
  await ui.press({ key: `open:${ROOT}/docs` })
  const opened = await texts(ui)
  await ui.press({ key: `open:${ROOT}/docs` })
  const closed = await texts(ui)

  // Assert
  expect(opened).toContain('guide.md')
  expect(closed).not.toContain('guide.md')
  await ui.unmount()
})

test('a folder Claude worked in can be closed, and files it touched stay marked', UI_TEST, async ($, on) => {
  // Arrange
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/lib/util.ts`, old_string: 'a', new_string: 'b' } as any)
  await $.tool.call({ tool: 'Read', file_path: `${ROOT}/src/app.ts` } as any)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const marked = await texts(ui)

  // Act
  await ui.press({ key: `open:${ROOT}/src/lib` })
  const lib = await texts(ui)
  await ui.press({ key: `open:${ROOT}/src` })
  const closed = await texts(ui)

  // Assert
  expect(marked).toEqual(expect.arrayContaining(['○ ', ' · 2', ' · 1']))
  expect(lib).toEqual(expect.arrayContaining(['● ', 'util.ts']))
  expect(closed).not.toContain('util.ts')
  expect(closed).toContain(' · 2')
  await ui.unmount()
})

test('a press on a file opens it in the app', UI_TEST, async ($, on) => {
  // Arrange
  const world = await start($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  // Act
  await ui.press({ key: `open:${ROOT}/README.md` })

  // Assert
  expect(world.opened).toEqual([{ pane: 'file', path: `${ROOT}/README.md` }])
  await ui.unmount()
})
