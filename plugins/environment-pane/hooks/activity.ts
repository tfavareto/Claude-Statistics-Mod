import type { Activity } from '../types'

const SCRATCH_MARKER = '/scratch-workspaces/'

const TOOL_ACTIVITY: Readonly<Record<string, Activity>> = {
  Edit: 'coding',
  Write: 'coding',
  MultiEdit: 'coding',
  NotebookEdit: 'coding',
  Bash: 'running',
  Read: 'reviewing',
  Grep: 'reviewing',
  Glob: 'reviewing',
  WebFetch: 'reviewing',
  WebSearch: 'reviewing',
}

export const ACTIVITY_LABEL: Readonly<Record<Activity, string>> = {
  coding: 'Writing code',
  running: 'Running commands',
  reviewing: 'Reviewing code',
  thinking: 'Thinking',
  idle: 'Idle',
}

// What the tree says beside the file Claude is on.
export const FILE_VERB: Readonly<Record<Activity, string>> = {
  coding: 'editing',
  running: 'running',
  reviewing: 'reading',
  thinking: 'last touched',
  idle: 'last touched',
}

export const activityOfTool = (tool: string): Activity => TOOL_ACTIVITY[tool] ?? 'thinking'

export const folderName = (cwd: string): string =>
  cwd === '' || cwd.includes(SCRATCH_MARKER) ? 'No folder' : (cwd.split('/').filter(Boolean).pop() ?? cwd)
