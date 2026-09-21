/**
 * generate-favicons.js
 *
 * Reads public/favicon.svg and produces:
 *   public/favicon.ico         (16×16, 32×32, 48×48 embedded PNGs)
 *   public/favicon.png         (32×32)
 *   public/favicon-16.png      (16×16)
 *   public/favicon-32.png      (32×32)
 *   public/apple-touch-icon.png (180×180)
 *
 * Run once:  node scripts/generate-favicons.js
 */

const sharp = require('sharp')
const fs    = require('fs')
const path  = require('path')

const SVG_FILE = path.join(__dirname, '..', 'public', 'favicon.svg')
const OUT_DIR  = path.join(__dirname, '..', 'public')

// ---------------------------------------------------------------------------
// ICO file builder (embeds PNG blobs — supported since Windows Vista / IE 7)
// ---------------------------------------------------------------------------
function buildIco(pngBuffers, sizes) {
  const count      = pngBuffers.length
  const headerSize = 6 + count * 16   // ICONDIR + n × ICONDIRENTRY

  // Calculate byte offsets for each image blob
  let offset = headerSize
  const entries = pngBuffers.map((buf, i) => {
    const entry = { buf, size: sizes[i], offset }
    offset += buf.length
    return entry
  })

  const ico = Buffer.alloc(offset)

  // --- ICONDIR (6 bytes) ---
  ico.writeUInt16LE(0, 0)      // idReserved  (must be 0)
  ico.writeUInt16LE(1, 2)      // idType      (1 = ICO)
  ico.writeUInt16LE(count, 4)  // idCount

  // --- ICONDIRENTRY per image (16 bytes each) ---
  let pos = 6
  entries.forEach(({ buf, size, offset: imgOffset }) => {
    ico.writeUInt8(size >= 256 ? 0 : size, pos)      // bWidth  (0 → 256)
    ico.writeUInt8(size >= 256 ? 0 : size, pos + 1)  // bHeight
    ico.writeUInt8(0, pos + 2)                        // bColorCount (0 = truecolor)
    ico.writeUInt8(0, pos + 3)                        // bReserved
    ico.writeUInt16LE(1, pos + 4)                     // wPlanes
    ico.writeUInt16LE(32, pos + 6)                    // wBitCount
    ico.writeUInt32LE(buf.length, pos + 8)            // dwBytesInRes
    ico.writeUInt32LE(imgOffset, pos + 12)            // dwImageOffset
    pos += 16
  })

  // --- Image data ---
  entries.forEach(({ buf, offset: imgOffset }) => buf.copy(ico, imgOffset))

  return ico
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(SVG_FILE)) {
    console.error('❌  public/favicon.svg not found. Run this script from the project root.')
    process.exit(1)
  }

  const svg = fs.readFileSync(SVG_FILE)
  console.log('📐  Converting favicon.svg …')

  const tasks = [
    // [filename, width, height]
    ['favicon-16.png',       16,  16],
    ['favicon-32.png',       32,  32],
    ['favicon.png',          32,  32],
    ['apple-touch-icon.png', 180, 180],
  ]

  for (const [filename, w, h] of tasks) {
    await sharp(svg).resize(w, h).png().toFile(path.join(OUT_DIR, filename))
    console.log(`  ✅  ${filename}  (${w}×${h})`)
  }

  // Build the multi-size ICO (16, 32, 48)
  const icoSizes = [16, 32, 48]
  const pngBlobs = await Promise.all(
    icoSizes.map(s => sharp(svg).resize(s, s).png().toBuffer())
  )
  const icoBuffer = buildIco(pngBlobs, icoSizes)
  fs.writeFileSync(path.join(OUT_DIR, 'favicon.ico'), icoBuffer)
  console.log('  ✅  favicon.ico  (16, 32, 48 px embedded)')

  console.log('\n🎉  All favicon assets written to /public\n')
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1) })
