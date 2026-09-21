/**
 * generate-favicons.cjs
 *
 * Takes Hrkicon.png, applies a perfect circular mask,
 * and outputs all favicon sizes with transparent corners.
 *
 * Run:  node scripts/generate-favicons.cjs
 */

const sharp = require('sharp')
const fs    = require('fs')
const path  = require('path')

const SOURCE = 'C:/Users/Lenovo/Downloads/Hrkicon.png'
const OUT    = path.join(__dirname, '..', 'public')

// ── Build a circular SVG mask for any given pixel size ──────────────────────
function circleMask(size) {
  const r = size / 2
  return Buffer.from(
    `<svg width="${size}" height="${size}">
       <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
     </svg>`
  )
}

// ── Resize + apply circular mask → returns a sharp pipeline ─────────────────
function circularPng(size) {
  return sharp(SOURCE)
    .resize({ width: size, height: size, fit: 'cover', position: 'centre' })
    .composite([{ input: circleMask(size), blend: 'dest-in' }])
    .png()   // PNG keeps the transparency
}

// ── ICO builder (embeds PNG blobs) ──────────────────────────────────────────
function buildIco(pngBuffers, sizes) {
  const count      = pngBuffers.length
  const headerSize = 6 + count * 16

  let offset = headerSize
  const entries = pngBuffers.map((buf, i) => {
    const e = { buf, size: sizes[i], offset }
    offset += buf.length
    return e
  })

  const ico = Buffer.alloc(offset)
  ico.writeUInt16LE(0, 0)
  ico.writeUInt16LE(1, 2)
  ico.writeUInt16LE(count, 4)

  let pos = 6
  entries.forEach(({ buf, size, offset: off }) => {
    ico.writeUInt8(size >= 256 ? 0 : size, pos)
    ico.writeUInt8(size >= 256 ? 0 : size, pos + 1)
    ico.writeUInt8(0, pos + 2)
    ico.writeUInt8(0, pos + 3)
    ico.writeUInt16LE(1,  pos + 4)
    ico.writeUInt16LE(32, pos + 6)
    ico.writeUInt32LE(buf.length, pos + 8)
    ico.writeUInt32LE(off,        pos + 12)
    pos += 16
  })

  entries.forEach(({ buf, offset: off }) => buf.copy(ico, off))
  return ico
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌  Not found:', SOURCE)
    process.exit(1)
  }

  const meta = await sharp(SOURCE).metadata()
  console.log(`\n📷  Source: ${meta.width}×${meta.height}px — ${path.basename(SOURCE)}`)
  console.log('⚙️   Applying circular mask and generating assets...\n')

  // ── PNG files ──────────────────────────────────────────────────────────────
  const tasks = [
    ['favicon.png',           32 ],
    ['favicon-16.png',        16 ],
    ['favicon-32.png',        32 ],
    ['apple-touch-icon.png', 180 ],
  ]

  for (const [name, size] of tasks) {
    await circularPng(size).toFile(path.join(OUT, name))
    console.log(`  ✅  ${name.padEnd(24)}  ${size}×${size} px  (circular)`)
  }

  // ── Multi-size ICO with circular PNGs ─────────────────────────────────────
  const icoSizes = [16, 32, 48]
  const blobs = await Promise.all(
    icoSizes.map(s => circularPng(s).toBuffer())
  )
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), buildIco(blobs, icoSizes))
  console.log(`  ✅  ${'favicon.ico'.padEnd(24)}  16, 32, 48 px  (circular, multi-size)`)

  console.log('\n🎉  Done! All circular favicon files saved to /public\n')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
