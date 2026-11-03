// Small marks for the connectors list, drawn here so nothing is fetched.
export const LOGO_SIZE = 16

const svg = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 16 16">${body}</svg>`

const LOGOS: readonly { match: RegExp; body: string }[] = [
  {
    match: /gmail/i,
    body:
      '<rect x="1" y="3" width="14" height="10" rx="1.5" fill="#FFFFFF"/>' +
      '<path d="M1.5 4.2 8 9l6.5-4.8" fill="none" stroke="#EA4335" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M1 4.5V13h2.5V6.6" fill="#4285F4"/><path d="M15 4.5V13h-2.5V6.6" fill="#34A853"/>',
  },
  {
    match: /notion/i,
    body:
      '<rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="#FFFFFF" stroke="#2F2F2F"/>' +
      '<path d="M5 11.5V4.5h1.2l3.6 5.2V4.5H11v7H9.8L6.2 6.3v5.2z" fill="#111111"/>',
  },
  {
    match: /drive/i,
    body:
      '<path d="M5.6 1.8h4.8l5 8.6-2.4 4.1z" fill="#FBBC04"/>' +
      '<path d="M5.6 1.8 0.6 10.4 3 14.5l5-8.6z" fill="#34A853"/>' +
      '<path d="M3 14.5h10l-2.4-4.1H5.4z" fill="#4285F4"/>',
  },
  {
    match: /calendar/i,
    body:
      '<rect x="1.5" y="2" width="13" height="12.5" rx="2" fill="#FFFFFF"/>' +
      '<rect x="1.5" y="2" width="13" height="3.5" rx="2" fill="#4285F4"/>' +
      '<text x="8" y="12.8" text-anchor="middle" font-family="system-ui, sans-serif" font-size="6.5" font-weight="700" fill="#4285F4">31</text>',
  },
  {
    match: /claude/i,
    body:
      '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#D97757"/>' +
      '<path d="M5 5h6M5 8h6M5 11h4" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>',
  },
  {
    match: /chrome/i,
    body:
      '<circle cx="8" cy="8" r="7" fill="#DB4437"/>' +
      '<path d="M8 8 1.9 11.5A7 7 0 0 0 8 15z" fill="#0F9D58"/><path d="M8 8v7a7 7 0 0 0 6.1-3.5z" fill="#0F9D58"/>' +
      '<path d="M8 8l6.1 3.5A7 7 0 0 0 15 8z" fill="#F4B400"/><path d="M8 8h7a7 7 0 0 0-1-3.5z" fill="#F4B400"/>' +
      '<circle cx="8" cy="8" r="3.2" fill="#FFFFFF"/><circle cx="8" cy="8" r="2.4" fill="#4285F4"/>',
  },
  {
    match: /banco|bank|finance/i,
    body:
      '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#0F9D58"/>' +
      '<path d="M3.5 6.5 8 3.8l4.5 2.7z" fill="#FFFFFF"/>' +
      '<path d="M4.5 7.5v3.5M7 7.5v3.5M9 7.5v3.5M11.5 7.5v3.5" stroke="#FFFFFF" stroke-width="1.1"/>' +
      '<rect x="3.5" y="11.5" width="9" height="1.2" fill="#FFFFFF"/>',
  },
  {
    match: /schedul|cron|task/i,
    body:
      '<circle cx="8" cy="8" r="6.5" fill="#3A3A3A" stroke="#9A9A9A"/>' +
      '<path d="M8 4.2V8l2.6 1.6" fill="none" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>',
  },
]

const FALLBACK_COLORS = ['#7C5CFF', '#E8692E', '#10A37F', '#3B82F6', '#D4A017', '#DB4437'] as const

// A letter on a colour picked from the name, for a connector without a mark here.
const fallback = (name: string): string => {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const color = FALLBACK_COLORS[hash % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0]
  const letter = (name.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase()

  return (
    `<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="${color}"/>` +
    `<text x="8" y="11.4" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#FFFFFF">${letter}</text>`
  )
}

export const logoSvg = (name: string): string => svg(LOGOS.find(logo => logo.match.test(name))?.body ?? fallback(name))
