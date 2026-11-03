// Every word the band draws, in the languages its `language` option offers.
export type Language = 'en' | 'pt-BR'

export type Words = {
  session: string
  week: string
  resetsIn: (time: string) => string
  now: string
  usedAlt: (label: string, percent: number) => string
  // "tomorrow night", "amanhã à noite": `days` from today, the weekday, the hour.
  when: (days: number, weekday: number, hour: number) => string
  weekday: (day: number) => string
  sessionRunsOut: (at: string, resetsAt: string) => string
  weekRunsOut: (when: string, resetDay: string) => string
  pace: (sentences: readonly string[]) => string
  lasts: string
}

const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const EN_PERIODS = [
  { until: 6, today: 'before dawn', later: 'before dawn' },
  { until: 12, today: 'this morning', later: 'morning' },
  { until: 18, today: 'this afternoon', later: 'afternoon' },
  { until: 24, today: 'tonight', later: 'night' },
] as const

const PT_WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const
const PT_FEMININE_WEEKDAYS = new Set([1, 2, 3, 4, 5])
const PT_PERIODS = [
  { until: 6, text: 'de madrugada' },
  { until: 12, text: 'de manhã' },
  { until: 18, text: 'à tarde' },
  { until: 24, text: 'à noite' },
] as const

const enWhen = (days: number, weekday: number, hour: number): string => {
  const period = EN_PERIODS.find(({ until }) => hour < until) ?? EN_PERIODS[3]
  if (days <= 0) return period.today
  if (period.until === 6) return `${days === 1 ? 'tomorrow' : `on ${EN_WEEKDAYS[weekday]}`} before dawn`

  return `${days === 1 ? 'tomorrow' : EN_WEEKDAYS[weekday]} ${period.later}`
}

const ptWhen = (days: number, weekday: number, hour: number): string => {
  const period = PT_PERIODS.find(({ until }) => hour < until)?.text ?? ''
  const day =
    days <= 0
      ? 'hoje'
      : days === 1
        ? 'amanhã'
        : `${PT_FEMININE_WEEKDAYS.has(weekday) ? 'na' : 'no'} ${PT_WEEKDAYS[weekday]}`

  return `${day} ${period}`
}

const EN: Words = {
  session: 'Session',
  week: 'Week',
  resetsIn: time => `resets in ${time}`,
  now: 'now',
  usedAlt: (label, percent) => `${label}: ${percent}% used`,
  when: enWhen,
  weekday: day => EN_WEEKDAYS[day] ?? '',
  sessionRunsOut: (at, resetsAt) => `the session limit runs out around ${at}, before it resets at ${resetsAt}`,
  weekRunsOut: (when, resetDay) => `the weekly limit runs out ${when}, before ${resetDay}'s reset`,
  pace: sentences => `At this pace, ${sentences.join('; and ')}.`,
  lasts: 'At this pace, both limits last until they reset.',
}

const PT_BR: Words = {
  session: 'Sessão',
  week: 'Semana',
  resetsIn: time => `renova em ${time}`,
  now: 'agora',
  usedAlt: (label, percent) => `${label}: ${percent}% usado`,
  when: ptWhen,
  weekday: day => PT_WEEKDAYS[day] ?? '',
  sessionRunsOut: (at, resetsAt) => `o limite da sessão acaba por volta das ${at}, antes da renovação às ${resetsAt}`,
  weekRunsOut: (when, resetDay) => `o limite semanal acaba ${when}, antes da renovação de ${resetDay}`,
  pace: sentences => `Nesse ritmo, ${sentences.join('; e ')}.`,
  lasts: 'Nesse ritmo, os limites duram até a renovação.',
}

export const wordsFor = (language: unknown): Words => (language === 'pt-BR' ? PT_BR : EN)
