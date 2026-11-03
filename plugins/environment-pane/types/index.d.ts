export type ContextRow = { name: string; tokens: number; kind: 'used' | 'free' | 'buffer' | 'deferred' }

export type ContextBreakdown = {
  totalTokens: number
  maxTokens: number
  percentage: number
  rows: ContextRow[]
}

export type Activity = 'coding' | 'running' | 'reviewing' | 'thinking' | 'idle'

// What Claude did to a file in this chat.
export type Touch = 'edited' | 'read'

// One line of the project tree: a folder opened on the way to what Claude works on.
export type TreeRow = {
  path: string
  name: string
  depth: number
  isDir: boolean
  isOpen: boolean
  isActive: boolean
  holdsActive: boolean
  touched?: Touch
  touchedCount: number
}

export type ServerRow = { key: string; name: string; kind: string; status: string; toolCount?: number }

export type RemoteState = 'on' | 'off' | 'connecting' | 'unavailable' | 'unknown'

declare module 'claude-code' {
  interface PluginState {
    'environment-pane': {
      breakdown: ContextBreakdown | null
      connectors: string[]
      servers: ServerRow[]
      remote: RemoteState
      isSwitchingRemote: boolean
      activity: Activity
      activePath: string | null
      tree: TreeRow[]
      expanded: string[]
      collapsed: string[]
      touched: Record<string, Touch>
    }
  }
}
