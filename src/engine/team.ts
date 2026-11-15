// チーム分析（3人以上）：相性マトリクス、五行と役割の偏り、不足要素、配置の提案のもとになる数値を出す。
// 文章は持たない。
import { ELEMENTS, type Element } from './tables'
import type { ChartCore } from './chart'
import { computeCompat } from './compat'
import { TEAM_CAUTION_SCORE, TEAM_ELEMENT_LACK, TEAM_ELEMENT_RICH } from './config'

/** 月柱の通変星を5グループにまとめた、仕事上の役割タイプ */
export type RoleGroup = 'hikaku' | 'shokusho' | 'zai' | 'kan' | 'in'
export const ROLE_GROUPS: RoleGroup[] = ['hikaku', 'shokusho', 'zai', 'kan', 'in']
export const ROLE_OF_TSUHEN: Record<string, RoleGroup> = {
  比肩: 'hikaku',
  劫財: 'hikaku',
  食神: 'shokusho',
  傷官: 'shokusho',
  偏財: 'zai',
  正財: 'zai',
  偏官: 'kan',
  正官: 'kan',
  偏印: 'in',
  印綬: 'in',
}
export const roleOf = (chart: ChartCore): RoleGroup => ROLE_OF_TSUHEN[chart.tsuhensei.monthBranch]

export interface TeamPair {
  /** メンバーの番号（渡した配列の index）。a < b */
  a: number
  b: number
  work: number
  private: number
}

export interface TeamResult {
  size: number
  /** matrix[i][j] = i と j の相性。同じ人どうしは null */
  matrix: ({ work: number; private: number } | null)[][]
  average: { work: number; private: number }
  /** 仕事スコアの高い順 */
  pairs: TeamPair[]
  bestPair: TeamPair
  /** 仕事スコアが最も低い組み合わせ（基準点を下回る場合のみ） */
  cautionPair?: TeamPair
  /** cautionPair の2人の間に入りやすい人 */
  mediator?: number
  /** 他のメンバーとの仕事スコアの平均が最も高い人 */
  hub: number
  /** 各メンバーの、他のメンバーとの仕事スコアの平均 */
  memberAverage: number[]
  /** 五行の1人あたり平均（合計6） */
  elements: Record<Element, number>
  richElements: Element[]
  lackElements: Element[]
  /** 役割タイプごとのメンバー番号 */
  roles: Record<RoleGroup, number[]>
  missingRoles: RoleGroup[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeTeam(charts: ChartCore[]): TeamResult {
  const n = charts.length
  if (n < 3) throw new Error('チーム分析には3人以上が必要です')

  const matrix: TeamResult['matrix'] = charts.map(() => charts.map(() => null))
  const pairs: TeamPair[] = []
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const r = computeCompat(charts[a], charts[b])
      const cell = { work: r.work, private: r.private }
      matrix[a][b] = cell
      matrix[b][a] = cell
      pairs.push({ a, b, ...cell })
    }
  }
  pairs.sort((x, y) => y.work - x.work || y.private - x.private)

  const memberAverage = charts.map((_, i) => {
    const others = matrix[i].filter((c): c is { work: number; private: number } => c !== null)
    return round1(others.reduce((s, c) => s + c.work, 0) / others.length)
  })
  const hub = memberAverage.indexOf(Math.max(...memberAverage))

  const lowest = pairs[pairs.length - 1]
  let cautionPair: TeamPair | undefined
  let mediator: number | undefined
  if (lowest.work < TEAM_CAUTION_SCORE) {
    cautionPair = lowest
    // 2人のどちらとも噛み合いやすい人（低い方のスコアが最も高い人）
    let best = -1
    for (let i = 0; i < n; i++) {
      if (i === lowest.a || i === lowest.b) continue
      const score = Math.min(matrix[i][lowest.a]!.work, matrix[i][lowest.b]!.work)
      if (score > best) {
        best = score
        mediator = i
      }
    }
  }

  const elements = Object.fromEntries(
    ELEMENTS.map((e) => [e, round1(charts.reduce((s, c) => s + c.elements[e], 0) / n)]),
  ) as Record<Element, number>

  const roles: Record<RoleGroup, number[]> = { hikaku: [], shokusho: [], zai: [], kan: [], in: [] }
  charts.forEach((c, i) => roles[roleOf(c)].push(i))

  return {
    size: n,
    matrix,
    average: {
      work: Math.round(pairs.reduce((s, p) => s + p.work, 0) / pairs.length),
      private: Math.round(pairs.reduce((s, p) => s + p.private, 0) / pairs.length),
    },
    pairs,
    bestPair: pairs[0],
    cautionPair,
    mediator,
    hub,
    memberAverage,
    elements,
    richElements: ELEMENTS.filter((e) => elements[e] >= TEAM_ELEMENT_RICH),
    lackElements: ELEMENTS.filter((e) => elements[e] <= TEAM_ELEMENT_LACK),
    roles,
    missingRoles: (Object.keys(roles) as RoleGroup[]).filter((r) => roles[r].length === 0),
  }
}
