import type { Activity } from '../types'

// A pixel Claude at a monitor, posed by what the chat is doing.
const CLAWD = '#D97757'
const EYES = '#1A1A1A'
const SCREEN = '#232323'
const FRAME = '#4A4A4A'
const CODE = '#F5F5F5'
const ACCENT = '#FF8A1F'
const LED_IDLE = '#5A5A5A'
const TYPE_SECONDS = 2.4
const LINE_STAGGER_SECONDS = 0.35
const KEY_SECONDS = 0.28

export const SCENE_WIDTH = 132
export const SCENE_HEIGHT = 84

const CODE_LINES = [
  { x: 70, width: 30 },
  { x: 76, width: 26 },
  { x: 76, width: 18 },
  { x: 70, width: 22 },
] as const

const isBusy = (activity: Activity): boolean => activity !== 'idle'

// Lines appear one by one while writing; a highlight scans them while reviewing.
const screen = (activity: Activity): string => {
  const lines = CODE_LINES.map(({ x, width }, index) => {
    const y = 16 + index * 7
    const typing =
      activity === 'coding'
        ? `<animate attributeName="width" values="0;${width};${width}" keyTimes="0;0.55;1" dur="${TYPE_SECONDS}s" begin="${index * LINE_STAGGER_SECONDS}s" repeatCount="indefinite"/>`
        : ''

    return `<rect x="${x}" y="${y}" width="${width}" height="3" rx="1" fill="${CODE}" fill-opacity="${isBusy(activity) ? 0.85 : 0.25}">${typing}</rect>`
  }).join('')

  if (activity === 'reviewing') {
    return (
      lines +
      `<rect x="66" y="14" width="56" height="7" fill="${ACCENT}" fill-opacity="0.25"><animate attributeName="y" values="14;21;28;35;14" dur="2s" repeatCount="indefinite"/></rect>`
    )
  }
  if (activity === 'running') {
    return (
      `<text x="68" y="22" font-family="monospace" font-size="8" fill="${ACCENT}">$</text>` +
      `<rect x="76" y="16" width="34" height="3" rx="1" fill="${CODE}" fill-opacity="0.85"/>` +
      `<rect x="76" y="24" width="24" height="3" rx="1" fill="${CODE}" fill-opacity="0.5"/>` +
      `<rect x="68" y="32" width="5" height="6" fill="${CODE}"><animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/></rect>`
    )
  }

  return lines
}

const arm = (x: number, delay: number, isTyping: boolean): string => {
  const tap = isTyping
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="${KEY_SECONDS}s" begin="${delay}s" repeatCount="indefinite"/>`
    : ''

  return `<rect x="${x}" y="50" width="6" height="5" fill="${CLAWD}">${tap}</rect>`
}

// Idle blinks; thinking looks up; reviewing looks across the screen.
const eyes = (activity: Activity): string => {
  const y = activity === 'thinking' ? 37 : 40
  const motion =
    activity === 'idle'
      ? '<animate attributeName="height" values="7;7;1;7" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>'
      : activity === 'reviewing'
        ? '<animateTransform attributeName="transform" type="translate" values="0 0;3 0;0 0" dur="2s" repeatCount="indefinite"/>'
        : ''

  return [24, 40].map(x => `<rect x="${x}" y="${y}" width="5" height="7" fill="${EYES}">${motion}</rect>`).join('')
}

const thoughtBubble = (): string =>
  `<circle cx="50" cy="26" r="2" fill="${CODE}" fill-opacity="0.6"/><circle cx="55" cy="19" r="3" fill="${CODE}" fill-opacity="0.6"/>` +
  `<rect x="38" y="2" width="30" height="13" rx="6" fill="${CODE}" fill-opacity="0.9"/>` +
  [45, 53, 61]
    .map(
      (cx, index) =>
        `<circle cx="${cx}" cy="8.5" r="2" fill="${SCREEN}"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="${index * 0.3}s" repeatCount="indefinite"/></circle>`,
    )
    .join('')

const led = (activity: Activity): string =>
  isBusy(activity)
    ? `<circle cx="119" cy="47" r="2" fill="${ACCENT}"><animate attributeName="opacity" values="1;0.25;1" dur="1.2s" repeatCount="indefinite"/></circle>`
    : `<circle cx="119" cy="47" r="2" fill="${LED_IDLE}"/>`

export const clawdScene = (activity: Activity): string => {
  const isTyping = activity === 'coding' || activity === 'running'
  const bob = isBusy(activity)
    ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur="0.9s" repeatCount="indefinite"/>'
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_WIDTH}" height="${SCENE_HEIGHT}" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" shape-rendering="crispEdges">` +
    `<rect x="62" y="8" width="64" height="44" rx="3" fill="${SCREEN}" stroke="${FRAME}" stroke-width="2"/>` +
    `<rect x="88" y="52" width="12" height="8" fill="${FRAME}"/>` +
    `<rect x="54" y="66" width="44" height="5" rx="1" fill="${FRAME}"/>` +
    screen(activity) +
    led(activity) +
    (activity === 'thinking' ? thoughtBubble() : '') +
    `<g>${bob}` +
    `<rect x="14" y="34" width="40" height="24" fill="${CLAWD}"/>` +
    eyes(activity) +
    arm(8, 0, isTyping) +
    arm(54, KEY_SECONDS / 2, isTyping) +
    [18, 26, 38, 46].map(x => `<rect x="${x}" y="58" width="5" height="8" fill="${CLAWD}"/>`).join('') +
    '</g></svg>'
  )
}

export const MINI_WIDTH = 30
export const MINI_HEIGHT = 22

// A small Claude for the tree row of the folder it works in.
export const miniClawd = (activity: Activity): string => {
  const isTyping = activity === 'coding' || activity === 'running'
  const tap = (delay: number): string =>
    isTyping
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="${KEY_SECONDS}s" begin="${delay}s" repeatCount="indefinite"/>`
      : ''
  const eyeMotion =
    activity === 'idle'
      ? '<animate attributeName="height" values="4;4;1;4" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>'
      : activity === 'reviewing'
        ? '<animateTransform attributeName="transform" type="translate" values="0 0;2 0;0 0" dur="2s" repeatCount="indefinite"/>'
        : ''
  const dots =
    activity === 'thinking'
      ? [10, 15, 20]
          .map(
            (cx, index) =>
              `<circle cx="${cx}" cy="2.5" r="1.5" fill="${CODE}"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="${index * 0.3}s" repeatCount="indefinite"/></circle>`,
          )
          .join('')
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MINI_WIDTH}" height="${MINI_HEIGHT}" viewBox="0 0 ${MINI_WIDTH} ${MINI_HEIGHT}" shape-rendering="crispEdges">` +
    dots +
    `<rect x="5" y="7" width="20" height="10" fill="${CLAWD}"/>` +
    [9, 18].map(x => `<rect x="${x}" y="9" width="3" height="4" fill="${EYES}">${eyeMotion}</rect>`).join('') +
    `<rect x="2" y="11" width="3" height="3" fill="${CLAWD}">${tap(0)}</rect>` +
    `<rect x="25" y="11" width="3" height="3" fill="${CLAWD}">${tap(KEY_SECONDS / 2)}</rect>` +
    [7, 11, 17, 21].map(x => `<rect x="${x}" y="17" width="2" height="4" fill="${CLAWD}"/>`).join('') +
    '</svg>'
  )
}
