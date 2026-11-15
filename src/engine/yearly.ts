// 年運：流年（その年の干支）と命式の関係、九星の年盤での回座位置から、年ごとの傾向を出す。
// 年の始まりは立春。文章は持たない。
import { BRANCHES, STEMS, juniun, tsuhensei } from './tables'
import type { ChartCore, Pillar } from './chart'
import { branchRelation, isKango, type BranchRelation, type Position } from './compat'
import { honmeiStar } from './kyusei'
import { POSITION_WEIGHTS, YEAR_ACTIVE, YEAR_CAREFUL, YEAR_POINTS } from './config'

/** 九星が年盤を巡る順（中宮から） */
export const PALACES = ['中宮', '乾宮', '兌宮', '艮宮', '離宮', '坎宮', '坤宮', '震宮', '巽宮'] as const
export type Palace = (typeof PALACES)[number]
export type YearLevel = 'active' | 'steady' | 'careful'

export interface YearFortune {
  /** 立春を年始とした年 */
  year: number
  pillar: Pillar
  /** 日干から見た流年の天干の通変星 */
  tsuhensei: string
  /** 日干から流年の地支に引いた十二運 */
  juniun: string
  /** 流年の地支と、命式の各柱の地支との関係 */
  relations: { position: Position; relation: BranchRelation; detail: string }[]
  /** 流年の天干が日干と干合するか */
  kango: boolean
  /** 空亡（天中殺）の年か */
  kuubou: boolean
  kyusei: { center: number; palace: Palace }
  /** 勢いの目安（配点の合計） */
  momentum: number
  level: YearLevel
}

export function yearPillar(year: number): Pillar {
  const idx = (((year - 4) % 60) + 60) % 60
  return { stem: idx % 10, branch: idx % 12, label: STEMS[idx % 10] + BRANCHES[idx % 12] }
}

/** その年の年盤で、本命星がどの宮に入るか */
export function palaceOf(honmei: number, year: number): Palace {
  const center = honmeiStar(year)
  return PALACES[(honmei - center + 9) % 9]
}

export function computeYear(chart: ChartCore, year: number): YearFortune {
  const pillar = yearPillar(year)
  const dayStem = chart.pillars.day.stem
  const ju = juniun(dayStem, pillar.branch)

  const relations: YearFortune['relations'] = []
  for (const position of ['day', 'month', 'year'] as Position[]) {
    const natal = chart.pillars[position].branch
    const relation = branchRelation(pillar.branch, natal)
    if (relation) relations.push({ position, relation, detail: `${BRANCHES[pillar.branch]}と${BRANCHES[natal]}` })
  }
  const kango = isKango(pillar.stem, dayStem)
  const kuubou = chart.kuubou.includes(BRANCHES[pillar.branch])
  const palace = palaceOf(chart.kyusei.honmei, year)

  let momentum = YEAR_POINTS.juniun[ju] + YEAR_POINTS.palace[palace]
  for (const r of relations) momentum += YEAR_POINTS.relation[r.relation] * POSITION_WEIGHTS[r.position]
  if (kango) momentum += YEAR_POINTS.kango
  if (kuubou) momentum += YEAR_POINTS.kuubou
  momentum = Math.round(momentum * 10) / 10

  return {
    year,
    pillar,
    tsuhensei: tsuhensei(dayStem, pillar.stem),
    juniun: ju,
    relations,
    kango,
    kuubou,
    kyusei: { center: honmeiStar(year), palace },
    momentum,
    level: momentum >= YEAR_ACTIVE ? 'active' : momentum <= YEAR_CAREFUL ? 'careful' : 'steady',
  }
}

/** 指定した年から複数年分 */
export function computeYears(chart: ChartCore, fromYear: number, count: number): YearFortune[] {
  return Array.from({ length: count }, (_, i) => computeYear(chart, fromYear + i))
}
