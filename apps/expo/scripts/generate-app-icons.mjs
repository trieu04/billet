// Generates Expo and web icons from the finalized Billet square logo (docs/brand/logo.md).
// Usage: pnpm --dir apps/expo exec node scripts/generate-app-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const CREAM = '#FFFCF7'
const INK = '#2A2521'
const CORAL = '#E3705A'

// Finalized parameters: stroke 18, square cap, stem 132, quadrants 50/0, lens dot.
const LAYOUT = { scale: 0.49, tx: 29.54, ty: -21.03 }
const GLYPH =
  '<path d="M50 109A41 41 0 0 1 91 150A41 41 0 0 1 50 191H9V150A41 41 0 0 1 50 109Z" stroke-linejoin="miter"/>' +
  '<path d="M9 68V150" stroke-linecap="butt"/>'
const LENS = '<circle cx="50" cy="150" r="17.6" fill="CORAL_FILL" stroke="none"/>'

function glyph({ ink, coral, scale = 1 }) {
  // `scale` shrinks the whole mark around the canvas center.
  const k = LAYOUT.scale * scale
  const offset = 50 - 50 * scale
  const tx = LAYOUT.tx * scale + offset
  const ty = LAYOUT.ty * scale + offset
  const lens = coral ? LENS.replace('CORAL_FILL', coral) : ''
  return `<g transform="translate(${tx} ${ty}) scale(${k})" fill="none" stroke="${ink}" stroke-width="18">${GLYPH}${lens}</g>`
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`

// Android shows only the inner 72/108 of an adaptive layer and guarantees a 66dp circle. The stem's
// top corner sits 42.9 units from the center, so 0.7 keeps it inside that circle (radius 30.56).
const ADAPTIVE_SCALE = 0.7
// Maskable web icons guarantee a circle of radius 40.
const MASKABLE_SCALE = 0.9

const fullBleed = (scale) =>
  `<rect width="100" height="100" fill="${CREAM}"/>${glyph({ ink: INK, coral: CORAL, scale })}`
const rounded = `<rect width="100" height="100" rx="23" fill="${CREAM}"/>${glyph({ ink: INK, coral: CORAL })}`

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const expoIcons = 'apps/expo/assets/icons'
const webPublic = 'apps/web/public'

const variants = [
  // iOS/default icon: full-bleed and without alpha (the OS applies the corner mask).
  { file: `${expoIcons}/icon.png`, size: 1024, body: fullBleed(), opaque: true },
  // Android adaptive foreground: transparent, mark kept inside the safe zone.
  {
    file: `${expoIcons}/adaptive-icon-foreground.png`,
    size: 1024,
    body: glyph({ ink: INK, coral: CORAL, scale: ADAPTIVE_SCALE }),
  },
  // Android 13+ themed icon: single-color silhouette.
  {
    file: `${expoIcons}/adaptive-icon-monochrome.png`,
    size: 1024,
    body: glyph({ ink: '#000000', scale: ADAPTIVE_SCALE }),
  },
  // Splash mark: transparent so the splash background color shows through.
  { file: `${expoIcons}/splash-icon.png`, size: 1024, body: glyph({ ink: INK, coral: CORAL }) },
  { file: `${expoIcons}/favicon.png`, size: 48, body: rounded },
  { file: `${webPublic}/favicon-48.png`, size: 48, body: rounded },
  { file: `${webPublic}/icon-192.png`, size: 192, body: rounded },
  { file: `${webPublic}/icon-512.png`, size: 512, body: rounded },
  {
    file: `${webPublic}/icon-maskable-512.png`,
    size: 512,
    body: fullBleed(MASKABLE_SCALE),
    opaque: true,
  },
  { file: `${webPublic}/apple-touch-icon.png`, size: 180, body: fullBleed(), opaque: true },
]

const vectors = [
  { file: `${expoIcons}/icon.svg`, body: fullBleed() },
  { file: `${webPublic}/favicon.svg`, body: rounded },
]

await mkdir(path.join(repoRoot, expoIcons), { recursive: true })
await mkdir(path.join(repoRoot, webPublic), { recursive: true })

for (const { file, size, body, opaque } of variants) {
  const image = sharp(Buffer.from(svg(body)), { density: 384 }).resize(size, size)
  if (opaque) image.flatten({ background: CREAM })
  await image.png().toFile(path.join(repoRoot, file))
  console.log(`wrote ${file} (${size}x${size})`)
}

for (const { file, body } of vectors) {
  await writeFile(path.join(repoRoot, file), svg(body))
  console.log(`wrote ${file}`)
}
