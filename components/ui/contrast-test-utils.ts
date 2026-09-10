type Rgb = [number, number, number]

export function readCssToken(block: string, name: string) {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Token CSS tidak ditemukan: --${name}`)
  return match[1].trim()
}

export function resolveCssToken(value: string, primitiveTokens: string) {
  const alias = value.match(/^var\((--[^)]+)\)$/)?.[1]
  return alias ? readCssToken(primitiveTokens, alias.slice(2)) : value
}

export function parseOklch(value: string): Rgb {
  const match = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) {
    const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
    if (!hex) throw new Error(`Nilai token bukan OKLCH atau hex: ${value}`)

    const digits = hex.length === 3 ? hex.split("").map((digit) => digit + digit) : hex.match(/../g)!
    return digits.map((channel) => Number.parseInt(channel, 16) / 255) as Rgb
  }

  const lightness = Number(match[1]) / 100
  const chroma = Number(match[2])
  const hue = (Number(match[3]) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function toSrgb(channel: number) {
  const value =
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * channel ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(1, value))
}

function relativeLuminance(rgb: Rgb) {
  return rgb.reduce(
    (total, channel, index) =>
      total +
      (channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index],
    0,
  )
}

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(parseOklch(foreground))
  const backgroundLuminance = relativeLuminance(parseOklch(background))
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}
