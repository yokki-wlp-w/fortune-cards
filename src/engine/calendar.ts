// 節入り（二十四節気のうち月の境目になる12の「節」）の日時を求める。
// 節気の天文計算は lunar-typescript に任せ、自前では実装しない。
// ライブラリは中国標準時(UTC+8)で返すため、日本標準時(UTC+9)に直して使う。
import { Solar } from 'lunar-typescript'

export interface Term {
  /** 日本語の節名 */
  name: string
  /** この節から始まる月の地支 index */
  branch: number
  year: number
  month: number
  day: number
  /** 日本時間での節入り時刻 "HH:MM" */
  time: string
  /** 比較用 yyyymmdd */
  ord: number
}

// [ライブラリ上のキー, 日本語名, 月支]
const JIE: [string, string, number][] = [
  ['小寒', '小寒', 1],
  ['立春', '立春', 2],
  ['惊蛰', '啓蟄', 3],
  ['清明', '清明', 4],
  ['立夏', '立夏', 5],
  ['芒种', '芒種', 6],
  ['小暑', '小暑', 7],
  ['立秋', '立秋', 8],
  ['白露', '白露', 9],
  ['寒露', '寒露', 10],
  ['立冬', '立冬', 11],
  ['大雪', '大雪', 0],
]

const cache = new Map<number, Term[]>()
const pad = (n: number) => String(n).padStart(2, '0')

/** 西暦 year の1月〜12月にある12の節を、日本時間で返す */
export function termsOfYear(year: number): Term[] {
  const hit = cache.get(year)
  if (hit) return hit
  const table = Solar.fromYmd(year, 6, 15).getLunar().getJieQiTable()
  const terms = JIE.map(([key, name, branch]) => {
    const s = table[key]
    // 中国標準時 → UTC → 日本標準時
    const utc = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour() - 8, s.getMinute(), s.getSecond())
    const j = new Date(utc + 9 * 3600 * 1000)
    const y = j.getUTCFullYear()
    const m = j.getUTCMonth() + 1
    const d = j.getUTCDate()
    // 表示用の時刻は分に四捨五入する（日付が変わってしまう場合は切り捨てのまま）
    const rounded = new Date(j.getTime() + 30 * 1000)
    const shown = rounded.getUTCDate() === d ? rounded : j
    return {
      name,
      branch,
      year: y,
      month: m,
      day: d,
      time: `${pad(shown.getUTCHours())}:${pad(shown.getUTCMinutes())}`,
      ord: y * 10000 + m * 100 + d,
    }
  })
  cache.set(year, terms)
  return terms
}

/** ユリウス通日（グレゴリオ暦） */
export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  )
}

/** 日柱の六十干支 index。日の区切りは0時 */
export function daySexagenary(y: number, m: number, d: number): number {
  return (julianDayNumber(y, m, d) + 49) % 60
}
