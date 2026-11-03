// A minimal loading bar: a white fill over a faint white track.
const FILL_COLOR = '#FFFFFF'
const TRACK_OPACITY = 0.16
const BAR_WIDTH = 96
const BAR_HEIGHT = 6
const TEXT_CELLS = 10

const clampPercent = (percent: number): number => Math.min(100, Math.max(0, percent))

export const barSvg = (percent: number): string => {
  const filled = (clampPercent(percent) / 100) * BAR_WIDTH
  const radius = BAR_HEIGHT / 2
  const fill =
    filled > 0
      ? `<rect width="${filled.toFixed(1)}" height="${BAR_HEIGHT}" rx="${radius}" fill="${FILL_COLOR}"/>`
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" viewBox="0 0 ${BAR_WIDTH} ${BAR_HEIGHT}">` +
    `<rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${radius}" fill="${FILL_COLOR}" fill-opacity="${TRACK_OPACITY}"/>` +
    `${fill}</svg>`
  )
}

export const barSize = { width: BAR_WIDTH, height: BAR_HEIGHT } as const

// The terminal draws no SVG: the same bar in block cells.
export const barCells = (percent: number): { filled: string; empty: string } => {
  const filled = Math.round((clampPercent(percent) / 100) * TEXT_CELLS)

  return { filled: '█'.repeat(filled), empty: '░'.repeat(TEXT_CELLS - filled) }
}
