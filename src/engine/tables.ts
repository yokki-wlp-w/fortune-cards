// 干支・五行の基本テーブル。UI に依存しない。

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export type Element = '木' | '火' | '土' | '金' | '水'
export const ELEMENTS: Element[] = ['木', '火', '土', '金', '水']

/** 天干の五行（index: 0=木 … 4=水） */
export const stemElementIdx = (stem: number): number => Math.floor(stem / 2)
/** 地支の五行 */
export const BRANCH_ELEMENT_IDX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]

/** 蔵干（本気・中気・余気の順）。値は天干の index */
export const HIDDEN_STEMS: number[][] = [
  [9], // 子: 癸
  [5, 7, 9], // 丑: 己 辛 癸
  [0, 2, 4], // 寅: 甲 丙 戊
  [1], // 卯: 乙
  [4, 9, 1], // 辰: 戊 癸 乙
  [2, 6, 4], // 巳: 丙 庚 戊
  [3, 5], // 午: 丁 己
  [5, 1, 3], // 未: 己 乙 丁
  [6, 8, 4], // 申: 庚 壬 戊
  [7], // 酉: 辛
  [4, 3, 7], // 戌: 戊 丁 辛
  [8, 0], // 亥: 壬 甲
]
/** 蔵干の数ごとの五行配分 */
export const HIDDEN_WEIGHTS: Record<number, number[]> = {
  1: [1],
  2: [0.7, 0.3],
  3: [0.6, 0.3, 0.1],
}

/** a が b を生じる（相生） */
export const generates = (a: number, b: number): boolean => (a + 1) % 5 === b
/** a が b を剋す（相剋） */
export const controls = (a: number, b: number): boolean => (a + 2) % 5 === b

const TSUHEN = [
  ['比肩', '劫財'],
  ['食神', '傷官'],
  ['偏財', '正財'],
  ['偏官', '正官'],
  ['偏印', '印綬'],
]
/** 通変星：日干から見た相手の天干 */
export function tsuhensei(dayStem: number, other: number): string {
  const diff = (stemElementIdx(other) - stemElementIdx(dayStem) + 5) % 5
  const samePolarity = dayStem % 2 === other % 2
  return TSUHEN[diff][samePolarity ? 0 : 1]
}

export const JUNIUN = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'] as const
/** 各天干の「長生」にあたる地支 */
const CHOSEI_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]
/** 十二運：天干から地支に引く。陽干は順行、陰干は逆行 */
export function juniun(stem: number, branch: number): string {
  const start = CHOSEI_BRANCH[stem]
  const idx = stem % 2 === 0 ? (branch - start + 12) % 12 : (start - branch + 12) % 12
  return JUNIUN[idx]
}

/** 空亡（天中殺）：六十干支の index から2つの地支を返す */
export function kuubou(sexagenary: number): [number, number] {
  const jun = Math.floor(sexagenary / 10)
  const first = (10 - 2 * jun + 12) % 12
  return [first, (first + 1) % 12]
}

/** 天干 index と地支 index から六十干支の index (0-59) を求める */
export function sexagenaryIndex(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i
  throw new Error('invalid stem/branch pair')
}
