import type { EngineInterface, McpToolResult } from 'claude-code'

import type { ServerRow } from '../types'

const CONNECTORS_SERVER = 'ccd_connectors'
// The app's own servers and Claude's built-in helpers, not connectors the person added.
const INTERNAL_PREFIXES = ['ccd_', 'Claude_Browser', 'visualize', 'plugin-authoring', 'mcp-registry', 'scheduled-tasks', 'terminal']
const PLUGIN_PREFIX = /^plugin:[^:]+:/

type StatusRow = { name?: unknown; id?: unknown; kind?: unknown; status?: unknown; tool_count?: unknown }

const textOf = (result: McpToolResult): string =>
  result.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

// `mcp__<server>__<tool>` → the server, or undefined for a tool that is not a connector's.
export const connectorServer = (tool: string): string | undefined => {
  if (!tool.startsWith('mcp__')) return undefined

  const server = tool.slice('mcp__'.length).split('__')[0]
  if (server === undefined || server === '') return undefined

  return INTERNAL_PREFIXES.some(prefix => server.startsWith(prefix)) ? undefined : server
}

// The server as tool names spell it: a connector by its id, a plugin's with `_` for `:`.
const toolKey = (name: string, id: unknown): string => (typeof id === 'string' ? id : name.replace(/:/g, '_'))

const toServerRow = (row: StatusRow): ServerRow[] =>
  typeof row.name === 'string' && typeof row.status === 'string'
    ? [
        {
          key: toolKey(row.name, row.id),
          name: row.name.replace(PLUGIN_PREFIX, ''),
          kind: typeof row.kind === 'string' ? row.kind : 'other',
          status: row.status,
          toolCount: typeof row.tool_count === 'number' ? row.tool_count : undefined,
        },
      ]
    : []

export async function readServers($: EngineInterface): Promise<ServerRow[]> {
  const result = await $.mcp.call(CONNECTORS_SERVER, 'session_connectors_status', {})
  if (result.isError) throw new Error(textOf(result))

  const rows: StatusRow[] = JSON.parse(textOf(result)).servers ?? []

  return rows.flatMap(toServerRow)
}
