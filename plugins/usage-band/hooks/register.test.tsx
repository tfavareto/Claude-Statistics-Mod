import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { paceText } from './pace'
import { wordsFor } from './words'

// 00:24 on a Tuesday in São Paulo, where these tests and the person run.
const NOW = Date.parse('2026-11-03T03:24:00.000Z')

// Mounting runs the engine; a busy machine needs more than the default 5 s.
const UI_TEST = { timeoutMs: 20_000, options: { language: 'pt-BR' } }

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const card = (windows: unknown[]) => ({
  value: {
    content: [{ type: 'text', text: JSON.stringify({ plan: { status: 'ok', windows } }) }],
    isError: false,
  },
})

const PLAN = [
  { label: '5-hour limit', percentUsed: 22, resetsAt: '2026-11-03T05:40:00.507Z' },
  { label: 'Weekly · all models', percentUsed: 50, resetsAt: '2026-11-08T07:00:00.507Z' },
  { label: 'Weekly · Fable', percentUsed: 0, resetsAt: '2026-11-08T07:00:00.000Z' },
]

const start = async ($: Engine, on: On, surface: 'desktop' | 'terminal') => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface, isInteractive: true })
}

test('the desktop band draws both bars, their resets and the weekly pace', UI_TEST, async ($, on) => {
  // Arrange
  on('mcp.call', () => card(PLAN))
  await start($, on, 'desktop')

  // Act
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /^Sessão$/ }))?.text).toBe('Sessão')
  expect((await ui.find({ type: 'Text', text: /22%/ }))?.text).toBe('22%')
  expect((await ui.find({ type: 'Text', text: /2h16/ }))?.text).toBe('renova em 2h16')
  expect((await ui.find({ type: 'Text', text: /50%/ }))?.text).toBe('50%')
  expect((await ui.find({ type: 'Text', text: /5d 3h/ }))?.text).toBe('renova em 5d 3h')
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /█/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /ritmo/ }))?.text).toBe(
    'Nesse ritmo, o limite semanal acaba amanhã à noite, antes da renovação de domingo.',
  )
  await ui.unmount()
})

test('the terminal draws the bar in cells and says when the session runs out', UI_TEST, async ($, on) => {
  // Arrange
  on('mcp.call', () => ({ deny: 'no such server' }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { window: 1_000_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 96, resetsAt: '2026-11-03T03:40:00.000Z' }],
    },
  }))
  await start($, on, 'terminal')

  // Act
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /█/ }))?.text).toBe('██████████')
  expect((await ui.find({ type: 'Text', text: /96%/ }))?.text).toBe('96%')
  expect((await ui.find({ type: 'Text', text: /ritmo/ }))?.text).toBe(
    'Nesse ritmo, o limite da sessão acaba por volta das 00:35, antes da renovação às 00:40.',
  )
  await ui.unmount()
})

test('a pace that lasts until the resets says so', UI_TEST, async ($, on) => {
  // Arrange
  on('mcp.call', () =>
    card([
      { label: '5-hour limit', percentUsed: 10, resetsAt: '2026-11-03T05:40:00.000Z' },
      { label: 'Weekly · all models', percentUsed: 5, resetsAt: '2026-11-08T07:00:00.000Z' },
    ]),
  )
  await start($, on, 'desktop')

  // Act
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /ritmo/ }))?.text).toBe(
    'Nesse ritmo, os limites duram até a renovação.',
  )
  await ui.unmount()
})

test('the band stays out of a survey', UI_TEST, async ($, on) => {
  // Arrange
  on('mcp.call', () => card(PLAN))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  await start($, on, 'desktop')

  // Act
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

test('the pace moves on while usage stands still', () => {
  // Arrange: the week at 50%, read again a day and two days later with no new use.
  const week = [{ kind: 'week' as const, label: 'Semana', percentUsed: 50, resetsAt: PLAN[1]!.resetsAt }]
  const DAY_MS = 24 * 60 * 60 * 1000

  // Act
  const today = paceText(week, NOW, wordsFor('pt-BR'))
  const tomorrow = paceText(week, NOW + DAY_MS, wordsFor('pt-BR'))
  const thursday = paceText(week, NOW + 2 * DAY_MS, wordsFor('pt-BR'))

  // Assert
  expect(today).toBe('Nesse ritmo, o limite semanal acaba amanhã à noite, antes da renovação de domingo.')
  expect(tomorrow).toBe('Nesse ritmo, o limite semanal acaba na sexta à noite, antes da renovação de domingo.')
  expect(thursday).toBe('Nesse ritmo, os limites duram até a renovação.')
})

test('the band speaks English by default', { timeoutMs: 20_000 }, async ($, on) => {
  // Arrange
  on('mcp.call', () => card(PLAN))
  await start($, on, 'desktop')

  // Act
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })

  // Assert
  expect((await ui.find({ type: 'Text', text: /^Session$/ }))?.text).toBe('Session')
  expect((await ui.find({ type: 'Text', text: /resets in 2h16/ }))?.text).toBe('resets in 2h16')
  expect((await ui.find({ type: 'Text', text: /pace/ }))?.text).toBe(
    "At this pace, the weekly limit runs out tomorrow night, before Sunday's reset.",
  )
  await ui.unmount()
})
