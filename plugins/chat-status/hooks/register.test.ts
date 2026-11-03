import { expect, test } from 'claude-code/testing'

// The test kit runs on a runtime with timers; the hooks module's own environment has none.
declare const setTimeout: (fn: () => void, ms: number) => unknown

// The person's sidebar: the three sections already exist under their default names.
const WORKING = 'cg-working'
const WAITING = 'cg-waiting'
const RESPONSE = 'cg-response'
const SECTIONS = [
  { id: WORKING, kind: 'manual', name: '🟢 Working' },
  { id: WAITING, kind: 'manual', name: '⏳ Waiting' },
  { id: RESPONSE, kind: 'manual', name: '🟡 Needs your answer' },
]
const HOME = '/Users/someone'

type Summary = { summarizes_uuid: string; status_category: string }
type Fixture = {
  sections?: { id: string; kind: string; name: string }[]
  isPinned?: boolean
  agents?: { id: string; status: string }[]
  summaries?: (Summary | null)[]
  fileText?: string
}

// Stands in for the engine: records each section the chat is moved to.
const arrange = (on: any, { sections = SECTIONS, isPinned = false, agents = [], summaries = [], fileText }: Fixture = {}) => {
  const moves: string[] = []
  const created: string[] = []
  let reads = 0

  on('mcp.call', (_: unknown, e: any) => {
    if (e.tool === 'list_sections') return { value: { content: [{ type: 'text', text: JSON.stringify(sections) }] } }
    if (e.tool === 'create_section') {
      created.push(e.args.name)
      return { value: { content: [{ type: 'text', text: JSON.stringify({ id: `cg-new-${created.length}` }) }] } }
    }
    if (e.tool === 'get_session') {
      return {
        value: {
          content: [{ type: 'text', text: JSON.stringify({ sessionId: 'local_x', pinned: isPinned }) }],
        },
      }
    }

    moves.push(e.args.section_id)

    return { value: { content: [{ type: 'text', text: 'ok' }] } }
  })
  on('agent.list', () => ({ value: agents }))
  on('env.get', () => ({ value: HOME }))
  on('fs.list', () => ({ value: [{ name: 'acct', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', () => {
    const summary = summaries[Math.min(reads, summaries.length - 1)] ?? null
    reads += 1

    return { value: fileText ?? JSON.stringify({ postTurnSummary: summary }) }
  })
  on('clock.after', () => ({ value: undefined }))
  on('turn.start', (_: unknown, e: any) => ({ turnId: e.turnId ?? 't' }))
  on('turn.complete', () => ({ text: '' }))

  return Object.assign(moves, { created })
}

test('moves the chat to working when the main turn starts', async ($, on) => {
  const moves = arrange(on)

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })

  expect(moves).toEqual([WORKING])
})

test('moves the chat to waiting when the main turn ends', async ($, on) => {
  const moves = arrange(on)

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([WORKING, WAITING])
})

test('stays in working while a background agent is running', async ($, on) => {
  const moves = arrange(on, { agents: [{ id: 'a1', status: 'running' }] })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([WORKING])
})

test('a subagent turn does not move the chat', async ($, on) => {
  const moves = arrange(on)

  await ($ as any).turn.start({ text: 'x', turnId: 't2', agentId: 'a1' })
  await ($ as any).turn.complete({ turnId: 't2', agentId: 'a1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([])
})

test('a pinned chat moves like any other, without asking if it is pinned', async ($, on) => {
  const moves = arrange(on, { isPinned: true })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([WORKING, WAITING])
})

test('a question for the person moves to response, then back to working', async ($, on) => {
  const moves = arrange(on)

  on('tool.call', () => ({ result: {} }))

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'AskUserQuestion', questions: [] })

  expect(moves).toEqual([WORKING, RESPONSE, WORKING])
})

test('a real permission prompt moves to response, then back to working', async ($, on) => {
  const moves = arrange(on)

  on('classic.PermissionRequest', () => ({}))
  on('tool.call', async () => {
    await ($ as any).classic.PermissionRequest({ tool_name: 'Bash', tool_input: {} })

    return { result: {} }
  })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'Bash', command: 'ls' })

  expect(moves).toEqual([WORKING, RESPONSE, WORKING])
})

test('a tool that needs no answer leaves the chat in working', async ($, on) => {
  const moves = arrange(on)

  on('tool.check', () => ({ decision: 'allow' }))
  on('tool.call', () => ({ result: {} }))

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'Bash', command: 'ls' })

  expect(moves).toEqual([WORKING])
})

test('a question interrupted by the person does not return to working', async ($, on) => {
  const moves = arrange(on)
  let isInterrupted = false

  on('tool.call', async () => {
    await ($ as any).turn.complete({ turnId: 't1', reason: 'aborted', answer: '', durationMs: 1, isAborted: true })
    isInterrupted = true

    return { result: {} }
  })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'AskUserQuestion', questions: [] })

  expect(isInterrupted).toBe(true)
  expect(moves).toEqual([WORKING, RESPONSE, WAITING])
})

const OLD = { summarizes_uuid: 'old', status_category: 'completed' }
const settle = () => new Promise<void>(resolve => setTimeout(() => resolve(), 30))
const endTurn = async ($: any) => {
  await $.turn.start({ text: 'oi', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })
  await settle()
}

test('a blocked summary of this turn moves the chat to response', async ($, on) => {
  const moves = arrange(on, {
    summaries: [OLD, OLD, { summarizes_uuid: 'new', status_category: 'blocked' }],
  })

  await endTurn($)

  expect(moves).toEqual([WORKING, WAITING, RESPONSE])
})

test('a finished summary leaves the chat in waiting', async ($, on) => {
  const moves = arrange(on, {
    summaries: [OLD, { summarizes_uuid: 'new', status_category: 'review_ready' }],
  })

  await endTurn($)

  expect(moves).toEqual([WORKING, WAITING])
})

test('a blocked summary left from an earlier turn is ignored', async ($, on) => {
  const moves = arrange(on, { summaries: [{ summarizes_uuid: 'old', status_category: 'blocked' }] })

  await endTurn($)

  expect(moves).toEqual([WORKING, WAITING])
})

test('an unreadable session file leaves the chat in waiting', async ($, on) => {
  const moves = arrange(on, { fileText: 'not json' })

  on('ui.log', () => ({ value: undefined }))

  await endTurn($)

  expect(moves).toEqual([WORKING, WAITING])
})

test('a wrap-up that blocks on the person ends the turn in response', async ($, on) => {
  const moves = arrange(on, { summaries: [OLD] })

  on('tool.call', () => ({ result: {} }))

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'mcp__ccd_turn__wrap_up', recap: 'x', ask: 'y?', blocked: true })
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([WORKING, RESPONSE])
})

test('a wrap-up with nothing pending ends the turn in waiting', async ($, on) => {
  const moves = arrange(on, { summaries: [OLD] })

  on('tool.call', () => ({ result: {} }))

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })
  await ($ as any).tool.call({ tool: 'mcp__ccd_turn__wrap_up', recap: 'x' })
  await ($ as any).turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false })

  expect(moves).toEqual([WORKING, WAITING])
})

test('a failed move never breaks the turn', async ($, on) => {
  on('mcp.call', () => {
    throw new Error('no such server')
  })
  on('agent.list', () => ({ value: [] }))
  on('ui.log', () => ({ value: undefined }))
  on('turn.start', (_: unknown, e: any) => ({ turnId: e.turnId }))

  const result = await ($ as any).turn.start({ text: 'oi', turnId: 't1' })

  expect(result.turnId).toBe('t1')
})

test('a missing section is created under its default name, then used', async ($, on) => {
  const moves = arrange(on, { sections: [] })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })

  expect(moves.created).toEqual(['🟢 Working'])
  expect([...moves]).toEqual(['cg-new-1'])
})

test('section names can be set in the options', { options: { workingSection: 'Em andamento' } }, async ($, on) => {
  const moves = arrange(on, { sections: [{ id: 'cg-pt', kind: 'manual', name: 'Em andamento' }] })

  await ($ as any).turn.start({ text: 'oi', turnId: 't1' })

  expect(moves.created).toEqual([])
  expect([...moves]).toEqual(['cg-pt'])
})
