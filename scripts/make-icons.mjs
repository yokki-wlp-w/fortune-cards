// アプリのアイコン（PNG）を作る。外部ライブラリなし。 実行: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// 角丸の四角形の内側かどうか（0〜1 の濃さで返し、縁をなめらかにする）
const roundRect = (x, y, cx, cy, hw, hh, r) => {
  const dx = Math.max(Math.abs(x - cx) - (hw - r), 0)
  const dy = Math.max(Math.abs(y - cy) - (hh - r), 0)
  return Math.max(0, Math.min(1, r - Math.hypot(dx, dy) + 0.5))
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

function icon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const s = size / 512
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      // 背景：藍色のグラデーション
      let col = mix([99, 102, 241], [67, 56, 202], (x + y) / (2 * size))
      // 後ろのカード（少し右上にずらす）
      const back = roundRect(x, y, 286 * s, 236 * s, 110 * s, 150 * s, 26 * s)
      col = mix(col, [199, 210, 254], back)
      // 手前のカード
      const front = roundRect(x, y, 226 * s, 276 * s, 110 * s, 150 * s, 26 * s)
      col = mix(col, [255, 255, 255], front)
      // カード中央の丸（人物の顔のイメージ）
      const dot = Math.max(0, Math.min(1, 52 * s - Math.hypot(x - 226 * s, y - 250 * s) + 0.5))
      col = mix(col, [245, 158, 11], dot * front)
      // 名前欄のイメージ
      const bar = roundRect(x, y, 226 * s, 356 * s, 62 * s, 12 * s, 12 * s)
      col = mix(col, [165, 180, 252], bar * front)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = col[0]
      raw[o + 1] = col[1]
      raw[o + 2] = col[2]
      raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icon-${size}.png`, icon(size))
  console.log(`public/icon-${size}.png`)
}
