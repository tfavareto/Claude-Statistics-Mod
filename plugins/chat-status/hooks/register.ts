import type { EngineInterface, McpToolResult, PluginOptions, Register } from 'claude-code'

// The three sidebar sections the chat moves between, found or created by name.
type SectionKind = 'working' | 'waiting' | 'response'

const DEFAULT_NAMES: Readonly<Record<SectionKind, string>> = {
  working: '🟢 Working',
  waiting: '⏳ Waiting',
  response: '🟡 Needs your answer',
}
const OPTION_OF: Readonly<Record<SectionKind, string>> = {
  working: 'workingSection',
  waiting: 'waitingSection',
  response: 'responseSection',
}

const SIDEBAR_SERVER = 'ccd_sidebar'
const SESSIONS_SERVER = 'ccd_session_mgmt'
const BUSY_AGENT_STATUSES: readonly string[] = ['pending', 'running']
const TOOLS_THAT_ASK_THE_PERSON: readonly string[] = ['AskUserQuestion', 'ExitPlanMode']
const WRAP_UP_TOOL = 'mcp__ccd_turn__wrap_up'

// Where the desktop app saves each chat (macOS). The yellow dot comes from its
// summary's `blocked` category, which the app writes some seconds after the turn ends.
const SESSION_FILES_DIR = 'Library/Application Support/Claude/claude-code-sessions'
const BLOCKED_CATEGORY = 'blocked'
const SUMMARY_POLL_MS = 5_000
const SUMMARY_POLL_ATTEMPTS = 24

type TurnSummary = { uuid: unknown; category: unknown }
type SidebarSection = { id?: unknown; kind?: unknown; name?: unknown }

let names: Record<SectionKind, string> = { ...DEFAULT_NAMES }
let sectionIds: Partial<Record<SectionKind, string>> = {}
let currentSection: SectionKind | undefined
let hasWarned = false
let isBlockedOnPerson = false
let lastSummaryUuid: unknown
let pendingToolName: string | undefined
let sessionFilePath: string | undefined
let summaryTimer: { cancel: () => void } | undefined

const textOf = (result: McpToolResult): string =>
  result.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

const namesFrom = (options: PluginOptions): Record<SectionKind, string> => {
  const pick = (kind: SectionKind): string => {
    const value = options[OPTION_OF[kind]]

    return typeof value === 'string' && value.trim() !== '' ? value.trim() : DEFAULT_NAMES[kind]
  }

  return { working: pick('working'), waiting: pick('waiting'), response: pick('response') }
}

// create_section answers with the new id, as JSON or in a sentence.
const idFromText = (text: string): string | undefined => {
  try {
    const parsed = JSON.parse(text)
    const id = parsed?.id ?? parsed?.section_id ?? parsed?.group_id

    if (typeof id === 'string') return id
  } catch {
    // Not JSON: look for the id in the sentence.
  }

  return text.match(/cg-[0-9a-f-]+/i)?.[0]
}

async function hasBusyAgent($: EngineInterface): Promise<boolean> {
  const agents = await $.agent.list()

  return agents.some(agent => BUSY_AGENT_STATUSES.includes(agent.status))
}

function warnOnce($: EngineInterface, error: unknown): void {
  if (hasWarned) return

  hasWarned = true
  $.ui.log(`chat-status: could not move this chat (${String(error)})`)
}

// The section's id, from the sidebar's sections or a new one with that name.
async function sectionId($: EngineInterface, kind: SectionKind): Promise<string> {
  const known = sectionIds[kind]
  if (known !== undefined) return known

  const listed = await $.mcp.call(SIDEBAR_SERVER, 'list_sections', {})
  if (listed.isError) throw new Error(textOf(listed))

  const sections: SidebarSection[] = JSON.parse(textOf(listed))
  const found = sections.find(section => section.kind === 'manual' && section.name === names[kind])
  const id = typeof found?.id === 'string' ? found.id : await createSection($, names[kind])

  sectionIds = { ...sectionIds, [kind]: id }

  return id
}

async function createSection($: EngineInterface, name: string): Promise<string> {
  const created = await $.mcp.call(SIDEBAR_SERVER, 'create_section', { name })
  const id = created.isError ? undefined : idFromText(textOf(created))
  if (id === undefined) throw new Error(`could not create the section "${name}": ${textOf(created)}`)

  return id
}

async function moveTo($: EngineInterface, kind: SectionKind): Promise<void> {
  if (kind === currentSection) return

  try {
    const result = await $.mcp.call(SIDEBAR_SERVER, 'move_sessions', {
      session_ids: ['self'],
      section_id: await sectionId($, kind),
    })
    if (result.isError) throw new Error(textOf(result))

    currentSection = kind
  } catch (error) {
    warnOnce($, error)
  }
}

// The app keeps each chat at <account>/<org>/<id>.json under the sessions folder.
async function findSessionFile($: EngineInterface): Promise<string | undefined> {
  const session = await $.mcp.call(SESSIONS_SERVER, 'get_session', { session_id: 'self' })
  if (session.isError) return undefined

  const sessionId = JSON.parse(textOf(session)).sessionId
  const home = await $.env.get('HOME')
  if (typeof sessionId !== 'string' || home === undefined) return undefined

  const root = `${home}/${SESSION_FILES_DIR}`
  for (const account of await $.fs.list(root).catch(() => [])) {
    for (const org of await $.fs.list(`${root}/${account.name}`).catch(() => [])) {
      const path = `${root}/${account.name}/${org.name}/${sessionId}.json`
      if (await $.fs.exists(path)) return path
    }
  }

  return undefined
}

async function readSummary($: EngineInterface): Promise<TurnSummary | undefined> {
  sessionFilePath ??= await findSessionFile($)
  if (sessionFilePath === undefined) return undefined

  const summary = JSON.parse(await $.fs.read(sessionFilePath)).postTurnSummary

  return summary ? { uuid: summary.summarizes_uuid, category: summary.status_category } : undefined
}

async function pollSummary($: EngineInterface, attemptsLeft: number): Promise<void> {
  try {
    const summary = await readSummary($)

    if (summary === undefined || summary.uuid === lastSummaryUuid) {
      watchSummary($, attemptsLeft - 1)
      return
    }

    lastSummaryUuid = summary.uuid
    if (summary.category === BLOCKED_CATEGORY) await moveTo($, 'response')
  } catch (error) {
    warnOnce($, error)
  }
}

function watchSummary($: EngineInterface, attemptsLeft: number): void {
  if (attemptsLeft === 0) return

  summaryTimer = $.clock.after(SUMMARY_POLL_MS, () => pollSummary($, attemptsLeft))
}

async function rememberSummaryBeforeTurn($: EngineInterface): Promise<void> {
  summaryTimer?.cancel()

  try {
    lastSummaryUuid = (await readSummary($))?.uuid
  } catch (error) {
    warnOnce($, error)
  }
}

async function moveToWaitingUnlessAgentsRun($: EngineInterface): Promise<void> {
  try {
    if (await hasBusyAgent($)) return

    await moveTo($, 'waiting')
    watchSummary($, SUMMARY_POLL_ATTEMPTS)
  } catch (error) {
    warnOnce($, error)
  }
}

export const register: Register = (on, options) => {
  names = namesFrom(options)
  sectionIds = {}

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await rememberSummaryBeforeTurn($)
      await moveTo($, 'working')
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)

    if (e.agentId !== undefined) return completed

    // An interrupted question must not move the chat back when its tool call unwinds.
    pendingToolName = undefined

    if (isBlockedOnPerson) await moveTo($, 'response')
    else await moveToWaitingUnlessAgentsRun($)

    isBlockedOnPerson = false

    return completed
  })

  // Fires only when a person is really asked, unlike a tool.check `ask`, which
  // auto mode settles by itself. Covers subagents' prompts too.
  on('classic.PermissionRequest', async ($, e, next) => {
    pendingToolName = e.tool_name
    await moveTo($, 'response')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === WRAP_UP_TOOL && e.blocked === true) isBlockedOnPerson = true

    if (TOOLS_THAT_ASK_THE_PERSON.includes(e.tool)) {
      pendingToolName = e.tool
      await moveTo($, 'response')
    }

    const called = await next(e)

    if (e.tool === pendingToolName) {
      pendingToolName = undefined
      await moveTo($, 'working')
    }

    return called
  })
}
