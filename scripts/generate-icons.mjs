import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const INK = [15, 36, 27, 255]
const PAPER = [243, 238, 227, 255]
const LIME = [201, 226, 101, 255]
const CLAY = [194, 84, 45, 255]

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function paint(size, paintFn) {
  const pixels = new Uint8Array(size * size * 4)
  paintFn(pixels, size)
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * stride + 1)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function rect(pixels, size, x0, y0, x1, y1, color, radius = 0) {
  const left = Math.round(x0 * size)
  const top = Math.round(y0 * size)
  const right = Math.round(x1 * size)
  const bottom = Math.round(y1 * size)
  const r = Math.round(radius * size)
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      let nx = x
      let ny = y
      if (r > 0) {
        if (x < left + r && y < top + r) {
          nx = left + r
          ny = top + r
        } else if (x >= right - r && y < top + r) {
          nx = right - r - 1
          ny = top + r
        } else if (x < left + r && y >= bottom - r) {
          nx = left + r
          ny = bottom - r - 1
        } else if (x >= right - r && y >= bottom - r) {
          nx = right - r - 1
          ny = bottom - r - 1
        }
      }
      if (r > 0) {
        const dx = x - nx
        const dy = y - ny
        const insideCorner =
          (x < left + r || x >= right - r) && (y < top + r || y >= bottom - r)
        if (insideCorner && dx * dx + dy * dy > r * r) continue
      }
      const offset = (y * size + x) * 4
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = color[3]
    }
  }
}

function draw(pixels, size) {
  rect(pixels, size, 0, 0, 1, 1, INK)
  rect(pixels, size, 0.2, 0.24, 0.8, 0.76, PAPER, 0.06)
  rect(pixels, size, 0.28, 0.35, 0.56, 0.385, INK)
  rect(pixels, size, 0.62, 0.35, 0.72, 0.385, CLAY)
  rect(pixels, size, 0.28, 0.46, 0.6, 0.495, INK)
  rect(pixels, size, 0.28, 0.57, 0.66, 0.605, INK)
  rect(pixels, size, 0.2, 0.81, 0.46, 0.855, LIME)
}

for (const size of [72, 96, 128, 152, 180, 192, 512]) {
  const file = join(outDir, `icon-${size}.png`)
  writeFileSync(file, paint(size, draw))
  console.log(`wrote ${file}`)
}
