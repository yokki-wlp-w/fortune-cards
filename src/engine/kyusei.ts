// 九星気学：本命星（立春基準の年）と月命星（節月）

export const KYUSEI_NAMES = [
  '',
  '一白水星',
  '二黒土星',
  '三碧木星',
  '四緑木星',
  '五黄土星',
  '六白金星',
  '七赤金星',
  '八白土星',
  '九紫火星',
]
/** 九星の五行 index（0=木 1=火 2=土 3=金 4=水） */
export const KYUSEI_ELEMENT_IDX = [-1, 4, 2, 0, 0, 2, 3, 3, 2, 1]

/** 本命星。solarYear は立春を年始とした年 */
export function honmeiStar(solarYear: number): number {
  const n = 11 - (((solarYear % 9) + 9) % 9)
  return n > 9 ? n - 9 : n
}

/** 月命星。本命星のグループで寅月の星が決まり、ひと月ごとに1つ戻る */
export function getsumeiStar(honmei: number, monthBranch: number): number {
  const start = [1, 4, 7].includes(honmei) ? 8 : [3, 6, 9].includes(honmei) ? 5 : 2
  const offset = (monthBranch - 2 + 12) % 12
  return ((((start - offset - 1) % 9) + 9) % 9) + 1
}
