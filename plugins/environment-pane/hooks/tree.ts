import type { EngineInterface } from 'claude-code'

import type { Touch, TreeRow } from '../types'

// What a project tree leaves out: version control, dependencies and caches.
const IGNORED = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__', '.venv', '.mypy_cache', '.pytest_cache'])
const MAX_ENTRIES_PER_FOLDER = 40

export const PATH_FIELDS = ['file_path', 'notebook_path', 'path'] as const

// The file or folder a tool call names, when it names one.
export const pathOfCall = (input: Readonly<Record<string, unknown>>): string | undefined => {
  const value = PATH_FIELDS.map(field => input[field]).find(field => typeof field === 'string' && field !== '')

  return typeof value === 'string' ? value : undefined
}

const trimSlash = (path: string): string => (path.length > 1 ? path.replace(/\/+$/, '') : path)

export const isInside = (root: string, path: string): boolean => {
  const base = trimSlash(root)

  return path === base || path.startsWith(`${base}/`)
}

// The folders from the root down to the one that holds `active`, root first.
export const foldersToward = (root: string, active: string | undefined): string[] => {
  const base = trimSlash(root)
  if (active === undefined || !isInside(base, active)) return [base]

  const parts = active.slice(base.length).split('/').filter(Boolean)

  return [base, ...parts.slice(0, -1).map((_, index) => `${base}/${parts.slice(0, index + 1).join('/')}`)]
}

// What the person opened, plus the way to Claude's file unless they closed a folder on it.
export type TreeView = {
  active: string | undefined
  expanded: readonly string[]
  collapsed: readonly string[]
  touched: Readonly<Record<string, Touch>>
}

const openSet = (root: string, view: TreeView): string[] => [
  ...foldersToward(root, view.active).filter(folder => !view.collapsed.includes(folder) || folder === trimSlash(root)),
  ...view.expanded,
]

const touchedBeneath = (folder: string, touched: Readonly<Record<string, Touch>>): number =>
  Object.keys(touched).filter(path => path.startsWith(`${folder}/`)).length

async function listFolder($: EngineInterface, folder: string): Promise<{ name: string; isDir: boolean }[]> {
  const entries = await $.fs.list(folder).catch(() => [])

  return entries
    .filter(entry => !IGNORED.has(entry.name) && entry.kind !== 'other')
    .map(entry => ({ name: entry.name, isDir: entry.kind === 'dir' }))
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
}

async function appendFolder(
  $: EngineInterface,
  folder: string,
  depth: number,
  open: readonly string[],
  view: TreeView,
  rows: TreeRow[],
): Promise<void> {
  const { active, touched } = view
  const entries = await listFolder($, folder)
  const shown = entries.slice(0, MAX_ENTRIES_PER_FOLDER)

  for (const entry of shown) {
    const path = `${folder}/${entry.name}`
    const isOpen = entry.isDir && open.includes(path)
    rows.push({
      path,
      name: entry.name,
      depth,
      isDir: entry.isDir,
      isOpen,
      isActive: path === active,
      holdsActive: entry.isDir && active !== undefined && isInside(path, active) && path !== active,
      touched: touched[path],
      touchedCount: entry.isDir ? touchedBeneath(path, touched) : 0,
    })
    if (isOpen) await appendFolder($, path, depth + 1, open, view, rows)
  }
  if (entries.length > shown.length) {
    rows.push({
      path: `${folder}/…`,
      name: `+${entries.length - shown.length} more`,
      depth,
      isDir: false,
      isOpen: false,
      isActive: false,
      holdsActive: false,
      touchedCount: 0,
    })
  }
}

// The root's entries, and those of each open folder: the person's and the way to Claude's file.
export async function readTree($: EngineInterface, root: string, view: TreeView): Promise<TreeRow[]> {
  const rows: TreeRow[] = []
  await appendFolder($, trimSlash(root), 0, openSet(root, view), view, rows)

  return rows
}
