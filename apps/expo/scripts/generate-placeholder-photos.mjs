// Generates the sample photos offered on the capture screen: every motif is
// rendered in several colour palettes and backdrops. Run `pnpm generate:placeholders`
// after editing motifs or palettes, then commit the output.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('..', import.meta.url))
const imageDir = `${root}assets/placeholders`
const thumbnailDir = `${imageDir}/thumbs`
const catalogFile = `${root}features/expense/placeholder-catalog.generated.ts`
const variantCount = 3

const palettes = [
  {
    bg: ['#F8D9C8', '#DAD3EE'],
    paper: '#FFFDF9',
    accent: '#F4B89C',
    accent2: '#E9806A',
    ink: '#3A1D0E',
  },
  {
    bg: ['#B9D4E8', '#DAD3EE'],
    paper: '#FFFDF9',
    accent: '#7FA8D6',
    accent2: '#F4B89C',
    ink: '#27384A',
  },
  {
    bg: ['#F7E7B4', '#F8D9C8'],
    paper: '#FFFDF9',
    accent: '#F2B94B',
    accent2: '#E9806A',
    ink: '#4A3411',
  },
  {
    bg: ['#CDE8D5', '#B9D4E8'],
    paper: '#FFFDF9',
    accent: '#6FB58F',
    accent2: '#F4B89C',
    ink: '#1F3D2E',
  },
  {
    bg: ['#F4C7D0', '#F8D9C8'],
    paper: '#FFFDF9',
    accent: '#E8708A',
    accent2: '#F7D679',
    ink: '#4A1E2A',
  },
  {
    bg: ['#3B3555', '#6A4E7C'],
    paper: '#FFF4E6',
    accent: '#F4B89C',
    accent2: '#F7D679',
    ink: '#241E38',
  },
]

const backdrops = [
  () =>
    `<circle cx="140" cy="160" r="110" fill="#fff" opacity=".18"/><circle cx="780" cy="1050" r="170" fill="#fff" opacity=".16"/>`,
  () =>
    [0, 1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<rect x="${-200 + i * 220}" y="-100" width="70" height="1500" fill="#fff" opacity=".12" transform="rotate(25 450 600)"/>`,
      )
      .join(''),
  () =>
    Array.from(
      { length: 30 },
      (_, i) =>
        `<circle cx="${90 + (i % 5) * 180}" cy="${100 + Math.floor(i / 5) * 190}" r="14" fill="#fff" opacity=".2"/>`,
    ).join(''),
]

// Motifs are drawn in a 900x1200 box, centred around (450, 540) before scaling.
const motifs = [
  {
    id: 'coffee',
    code: 'food',
    label: 'Cà phê',
    art: (p) => `
      <ellipse cx="450" cy="760" rx="260" ry="46" fill="${p.paper}" opacity=".9"/>
      <path d="M270 440h360v170a180 150 0 0 1-360 0z" fill="${p.paper}"/>
      <path d="M630 480h40a60 60 0 0 1 0 120h-52" fill="none" stroke="${p.paper}" stroke-width="30" stroke-linecap="round"/>
      <rect x="285" y="455" width="330" height="46" rx="22" fill="${p.accent2}"/>
      <g fill="none" stroke="${p.paper}" stroke-width="22" stroke-linecap="round" opacity=".85">
        <path d="M380 380c-40-40 40-60 0-110"/><path d="M450 380c-40-40 40-60 0-110"/><path d="M520 380c-40-40 40-60 0-110"/>
      </g>`,
  },
  {
    id: 'bowl',
    code: 'food',
    label: 'Bữa ăn',
    art: (p) => `
      <path d="M190 560h520a260 230 0 0 1-520 0z" fill="${p.paper}"/>
      <rect x="360" y="745" width="180" height="40" rx="20" fill="${p.paper}" opacity=".9"/>
      <path d="M230 560c30-90 120-140 220-140s190 50 220 140z" fill="${p.accent}"/>
      <circle cx="380" cy="505" r="26" fill="#9CC59A"/><circle cx="470" cy="480" r="22" fill="${p.accent2}"/><circle cx="540" cy="515" r="20" fill="#F7D679"/>
      <g stroke="${p.paper}" stroke-width="20" stroke-linecap="round"><path d="M560 300l130 250"/><path d="M610 285l130 250"/></g>`,
  },
  {
    id: 'cupcake',
    code: 'food',
    label: 'Bánh ngọt',
    art: (p) => `
      <path d="M300 600h300l-40 190H340z" fill="${p.paper}"/>
      <g stroke="${p.accent}" stroke-width="16" stroke-linecap="round"><path d="M380 625l12 140"/><path d="M450 625v140"/><path d="M520 625l-12 140"/></g>
      <ellipse cx="450" cy="590" rx="190" ry="70" fill="${p.accent}"/>
      <ellipse cx="450" cy="510" rx="140" ry="62" fill="${p.accent2}"/>
      <ellipse cx="450" cy="440" rx="90" ry="52" fill="${p.accent}"/>
      <circle cx="450" cy="368" r="30" fill="${p.paper}"/>`,
  },
  {
    id: 'bus',
    code: 'transport',
    label: 'Xe buýt',
    art: (p) => `
      <rect x="215" y="330" width="470" height="400" rx="70" fill="${p.paper}"/>
      <rect x="255" y="370" width="390" height="170" rx="30" fill="${p.bg[0]}"/>
      <rect x="215" y="580" width="470" height="30" fill="${p.accent}"/>
      <circle cx="300" cy="640" r="26" fill="#F7D679"/><circle cx="600" cy="640" r="26" fill="#F7D679"/>
      <circle cx="310" cy="745" r="48" fill="${p.ink}"/><circle cx="590" cy="745" r="48" fill="${p.ink}"/>
      <circle cx="310" cy="745" r="18" fill="${p.paper}"/><circle cx="590" cy="745" r="18" fill="${p.paper}"/>`,
  },
  {
    id: 'car',
    code: 'transport',
    label: 'Ô tô',
    art: (p) => `
      <path d="M320 520l55-110h150l65 110z" fill="${p.paper}"/>
      <path d="M350 505l38-76h60v76zM476 505v-76h50l45 76z" fill="${p.bg[0]}"/>
      <rect x="200" y="510" width="500" height="170" rx="60" fill="${p.paper}"/>
      <rect x="200" y="590" width="500" height="26" fill="${p.accent}"/>
      <circle cx="660" cy="560" r="20" fill="#F7D679"/>
      <circle cx="320" cy="690" r="55" fill="${p.ink}"/><circle cx="580" cy="690" r="55" fill="${p.ink}"/>
      <circle cx="320" cy="690" r="20" fill="${p.paper}"/><circle cx="580" cy="690" r="20" fill="${p.paper}"/>`,
  },
  {
    id: 'bag',
    code: 'shopping',
    label: 'Túi mua sắm',
    art: (p) => `
      <path d="M250 430h400l40 360H210z" fill="${p.paper}"/>
      <path d="M340 450v-50a110 110 0 0 1 220 0v50" fill="none" stroke="${p.paper}" stroke-width="30" stroke-linecap="round"/>
      <circle cx="340" cy="500" r="18" fill="${p.accent}"/><circle cx="560" cy="500" r="18" fill="${p.accent}"/>
      <path d="M450 600l30 60 66 10-48 46 12 66-60-32-60 32 12-66-48-46 66-10z" fill="${p.accent}"/>`,
  },
  {
    id: 'cart',
    code: 'shopping',
    label: 'Giỏ hàng',
    art: (p) => `
      <path d="M200 330h80l60 300h310" fill="none" stroke="${p.paper}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M305 410h410l-50 220H350z" fill="${p.paper}"/>
      <circle cx="400" cy="500" r="30" fill="${p.accent}"/><circle cx="490" cy="480" r="26" fill="${p.accent2}"/><circle cx="575" cy="505" r="28" fill="#F7D679"/>
      <circle cx="380" cy="720" r="38" fill="${p.paper}"/><circle cx="620" cy="720" r="38" fill="${p.paper}"/>`,
  },
  {
    id: 'gamepad',
    code: 'entertainment',
    label: 'Chơi game',
    art: (p) => `
      <rect x="190" y="470" width="520" height="250" rx="125" fill="${p.paper}"/>
      <rect x="300" y="565" width="100" height="28" rx="12" fill="${p.accent}"/><rect x="336" y="529" width="28" height="100" rx="12" fill="${p.accent}"/>
      <circle cx="560" cy="540" r="28" fill="${p.accent2}"/><circle cx="620" cy="600" r="28" fill="${p.accent}"/>
      <circle cx="500" cy="600" r="16" fill="${p.accent}" opacity=".5"/><circle cx="450" cy="640" r="12" fill="${p.accent}" opacity=".5"/>`,
  },
  {
    id: 'ticket',
    code: 'entertainment',
    label: 'Vé xem phim',
    art: (p) => `
      <path d="M200 480a30 30 0 0 1 30-30h440a30 30 0 0 1 30 30v90a40 40 0 0 0 0 80v70a30 30 0 0 1-30 30H230a30 30 0 0 1-30-30v-70a40 40 0 0 0 0-80z" fill="${p.paper}"/>
      <path d="M520 470v260" stroke="${p.accent}" stroke-width="10" stroke-dasharray="26 20"/>
      <path d="M360 540l24 50 54 8-39 38 9 54-48-26-48 26 9-54-39-38 54-8z" fill="${p.accent2}"/>
      <path d="M570 560h70M570 620h70M570 680h70" stroke="${p.accent}" stroke-width="18" stroke-linecap="round"/>`,
  },
  {
    id: 'receipt',
    code: 'bills',
    label: 'Hóa đơn',
    art: (p) => `
      <path d="M240 280H660V800L625 776 590 800 555 776 520 800 485 776 450 800 415 776 380 800 345 776 310 800 275 776 240 800Z" fill="${p.paper}"/>
      <g stroke="${p.ink}" stroke-width="22" stroke-linecap="round" opacity=".22">
        <path d="M300 370h300"/><path d="M300 440h300"/><path d="M300 510h200"/><path d="M300 580h300"/>
      </g>
      <path d="M300 670h120M500 670h100" stroke="${p.accent}" stroke-width="30" stroke-linecap="round"/>`,
  },
  {
    id: 'bulb',
    code: 'bills',
    label: 'Tiền điện',
    art: (p) => `
      <circle cx="450" cy="480" r="170" fill="${p.paper}"/>
      <path d="M385 600h130v90a30 30 0 0 1-30 30h-70a30 30 0 0 1-30-30z" fill="${p.paper}"/>
      <path d="M385 630h130M385 665h130" stroke="${p.bg[1]}" stroke-width="14"/>
      <path d="M475 370l-85 125h60l-25 95 105-140h-62z" fill="${p.accent}"/>
      <g stroke="${p.paper}" stroke-width="20" stroke-linecap="round"><path d="M450 240v-50"/><path d="M285 310l-40-35"/><path d="M615 310l40-35"/></g>`,
  },
  {
    id: 'heart',
    code: 'health',
    label: 'Sức khỏe',
    art: (p) => `
      <path d="M450 760C250 620 220 470 330 410c60-33 105-5 120 45 15-50 60-78 120-45 110 60 80 210-120 350z" fill="${p.paper}"/>
      <path d="M300 560h110l30-80 50 150 30-70h90" fill="none" stroke="${p.accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'pill',
    code: 'health',
    label: 'Thuốc',
    art: (p) => `
      <g transform="rotate(-35 450 600)">
        <rect x="240" y="520" width="420" height="170" rx="85" fill="${p.paper}"/>
        <path d="M450 520h125a85 85 0 0 1 0 170H450z" fill="${p.accent}"/>
      </g>
      <circle cx="270" cy="760" r="40" fill="${p.paper}"/><path d="M245 760h50" stroke="${p.accent2}" stroke-width="10"/>
      <circle cx="640" cy="360" r="28" fill="${p.accent2}"/>`,
  },
  {
    id: 'book',
    code: 'education',
    label: 'Sách vở',
    art: (p) => `
      <path d="M450 460c-60-40-150-52-235-32v330c85-20 175-8 235 32z" fill="${p.paper}"/>
      <path d="M450 460c60-40 150-52 235-32v330c-85-20-175-8-235 32z" fill="${p.paper}" opacity=".88"/>
      <path d="M450 460v330" stroke="${p.accent}" stroke-width="12"/>
      <g stroke="${p.accent}" stroke-width="16" stroke-linecap="round" opacity=".7"><path d="M270 520c40-8 80-6 130 8"/><path d="M270 590c40-8 80-6 130 8"/><path d="M500 528c50-14 90-16 130-8"/><path d="M500 598c50-14 90-16 130-8"/></g>
      <path d="M580 430v120l30-22 30 22V420z" fill="${p.accent2}"/>`,
  },
  {
    id: 'gift',
    code: 'other',
    label: 'Quà tặng',
    art: (p) => `
      <rect x="240" y="440" width="420" height="330" rx="28" fill="${p.paper}"/>
      <rect x="215" y="380" width="470" height="100" rx="26" fill="${p.accent}"/>
      <rect x="410" y="380" width="80" height="390" fill="${p.accent2}"/>
      <path d="M450 380c-80-120-190-70-140-10 30 36 100 10 140 10zM450 380c80-120 190-70 140-10-30 36-100 10-140 10z" fill="${p.accent2}"/>`,
  },
]

function render(motif, motifIndex, variant) {
  const p = palettes[(motifIndex + variant * 2) % palettes.length]
  const backdrop = backdrops[(motifIndex + variant) % backdrops.length]
  // Motifs are scaled up around the canvas centre so they stay readable in small thumbnails.
  const scale = 1.35
  const flip = variant === 1 ? -1 : 1
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>
    <rect width="900" height="1200" fill="url(#g)"/>
    ${backdrop()}
    <g transform="translate(450 600) scale(${flip * scale} ${scale}) translate(-450 -540)">${motif.art(p)}</g>
  </svg>`
}

await rm(imageDir, { force: true, recursive: true })
await mkdir(thumbnailDir, { recursive: true })

// Variant-major order keeps neighbouring photos different in the capture strip.
const entries = []
for (let variant = 0; variant < variantCount; variant += 1) {
  for (const [index, motif] of motifs.entries()) {
    const id = `${motif.code}-${motif.id}-${variant + 1}`
    const svg = Buffer.from(render(motif, index, variant))
    await sharp(svg).resize(600, 800).jpeg({ quality: 80 }).toFile(`${imageDir}/${id}.jpg`)
    // Small copies keep the capture strip cheap to decode and independent of how a device
    // downsamples large bitmaps.
    await sharp(svg).resize(144, 192).jpeg({ quality: 80 }).toFile(`${thumbnailDir}/${id}.jpg`)
    entries.push({ id, code: motif.code, label: motif.label, motifId: `${motif.code}-${motif.id}` })
  }
}

const lines = entries.map(
  ({ id, code, label, motifId }) => `  {
    id: '${id}',
    motifId: '${motifId}',
    categoryCode: '${code}',
    label: '${label}',
    source: require('../../assets/placeholders/${id}.jpg'),
    thumbnail: require('../../assets/placeholders/thumbs/${id}.jpg'),
  },`,
)
await writeFile(
  catalogFile,
  `// Generated by scripts/generate-placeholder-photos.mjs. Do not edit by hand.
export const placeholderCatalog = [
${lines.join('\n')}
]
`,
)
console.log(`Generated ${entries.length} placeholder photos`)
