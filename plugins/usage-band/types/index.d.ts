export type UsageWindow = {
  kind: 'session' | 'week'
  label: string
  percentUsed: number
  resetsAt?: string
}

export type PlanUsage = { windows: UsageWindow[]; fetchedAt: number }

// `plan` replaces 0.2's `usage`, whose windows carried no `kind`.
declare module 'claude-code' {
  interface PluginState {
    'usage-band': { plan: PlanUsage | null; now: number }
  }
}
