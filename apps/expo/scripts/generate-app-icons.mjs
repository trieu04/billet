// Generates Expo app icons from the finalized Billet square logo (docs/brand/logo.md).
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

const variants = {
  // iOS/default icon: opaque, full-bleed (the OS applies the corner mask).
  'icon.png': {
    size: 1024,
    body: `<rect width="100" height="100" fill="${CREAM}"/>${glyph({ ink: INK, coral: CORAL })}`,
  },
  // Android adaptive foreground: transparent, mark kept inside the 66% safe zone.
  'adaptive-icon-foreground.png': { size: 1024, body: glyph({ ink: INK, coral: CORAL }) },
  // Android 13+ themed icon: single-color silhouette.
  'adaptive-icon-monochrome.png': { size: 1024, body: glyph({ ink: '#000000' }) },
  // Splash mark: transparent so the splash background color shows through.
  'splash-icon.png': { size: 1024, body: glyph({ ink: INK, coral: CORAL }) },
  // Web favicon.
  'favicon.png': {
    size: 48,
    body: `<rect width="100" height="100" rx="23" fill="${CREAM}"/>${glyph({ ink: INK, coral: CORAL })}`,
  },
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons')
await mkdir(outDir, { recursive: true })

for (const [name, { size, body }] of Object.entries(variants)) {
  const source = svg(body)
  await sharp(Buffer.from(source), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name))
  if (name === 'icon.png') await writeFile(path.join(outDir, 'icon.svg'), source)
  console.log(`wrote assets/icons/${name} (${size}x${size})`)
}
