// 二者の相性。四柱推命と九星気学を計算対象とし、仕事 / プライベートを別スコアで返す。
// 文章は持たない（因子のキーとパラメータだけを返し、content 層が文章にする）。
import { BRANCHES, ELEMENTS, controls, generates, stemElementIdx } from './tables'
import type { ChartCore } from './chart'
import { KYUSEI_ELEMENT_IDX } from './kyusei'
import {
  BASE_SCORE,
  ELEMENT_LACK,
  ELEMENT_RICH,
  FACTOR_POINTS,
  MAX_SCORE,
  MIN_SCORE,
  POSITION_WEIGHTS,
  SYSTEM_WEIGHTS,
} from './config'

export type CompatSystem = 'shichu' | 'kyusei'
export type BranchRelation = 'same' | 'rikugo' | 'sango' | 'chu' | 'kei' | 'gai'
export type Position = 'day' | 'month' | 'year'

export interface CompatFactor {
  /** FACTOR_POINTS / 文章テンプレートのキー */
  key: string
  system: CompatSystem
  work: number
  private: number
  /**
   * from/to: 0 = 1人目, 1 = 2人目（生じる側・剋す側・補う側が from）
   * position: 地支の関係を見た柱 / detail: 干支や五行の表示用
   */
  params: { from?: 0 | 1; to?: 0 | 1; position?: Position; detail?: string }
}

export interface CompatResult {
  work: number
  private: number
  bySystem: Record<CompatSystem, { work: number; private: number }>
  factors: CompatFactor[]
  /** 相手の日支が自分の空亡にあたる場合の参考情報（スコア対象外）。値は空亡を持つ側 */
  kuubouHits: (0 | 1)[]
}

const pair = (a: number, b: number, x: number, y: number) => (a === x && b === y) || (a === y && b === x)
const RIKUGO: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]
const KEI: [number, number][] = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]]
const GAI: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]

/** 地支どうしの関係。重なる場合は 冲 > 合 > 三合 > 刑 > 害 の順で1つだけ返す */
export function branchRelation(a: number, b: number): BranchRelation | null {
  if (a === b) return 'same'
  if ((a - b + 12) % 12 === 6) return 'chu'
  if (RIKUGO.some(([x, y]) => pair(a, b, x, y))) return 'rikugo'
  if (a % 4 === b % 4) return 'sango'
  if (KEI.some(([x, y]) => pair(a, b, x, y))) return 'kei'
  if (GAI.some(([x, y]) => pair(a, b, x, y))) return 'gai'
  return null
}

/** 干合（甲己・乙庚・丙辛・丁壬・戊癸） */
export const isKango = (a: number, b: number): boolean => a !== b && (a - b + 10) % 5 === 0

const clamp = (n: number) => Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(n)))

export function computeCompat(a: ChartCore, b: ChartCore): CompatResult {
  const factors: CompatFactor[] = []
  const add = (key: string, system: CompatSystem, params: CompatFactor['params'] = {}, scale = 1) => {
    const p = FACTOR_POINTS[key]
    factors.push({ key, system, work: p.work * scale, private: p.private * scale, params })
  }

  // --- 四柱推命：日干の関係 ---
  const sa = a.pillars.day.stem
  const sb = b.pillars.day.stem
  const ea = stemElementIdx(sa)
  const eb = stemElementIdx(sb)
  const stems = `${a.dayStem}（${ELEMENTS[ea]}）と${b.dayStem}（${ELEMENTS[eb]}）`
  if (isKango(sa, sb)) add('stem.kango', 'shichu', { detail: stems })
  else if (ea === eb) add('stem.same', 'shichu', { detail: stems })
  else if (generates(ea, eb)) add('stem.gen', 'shichu', { from: 0, to: 1, detail: stems })
  else if (generates(eb, ea)) add('stem.gen', 'shichu', { from: 1, to: 0, detail: stems })
  else if (controls(ea, eb)) add('stem.ctrl', 'shichu', { from: 0, to: 1, detail: stems })
  else if (controls(eb, ea)) add('stem.ctrl', 'shichu', { from: 1, to: 0, detail: stems })

  // --- 四柱推命：地支の合・冲・刑・害 ---
  for (const pos of ['day', 'month', 'year'] as Position[]) {
    const ba = a.pillars[pos].branch
    const bb = b.pillars[pos].branch
    const rel = branchRelation(ba, bb)
    if (rel) {
      add(`branch.${rel}`, 'shichu', { position: pos, detail: `${BRANCHES[ba]}と${BRANCHES[bb]}` }, POSITION_WEIGHTS[pos])
    }
  }

  // --- 四柱推命：五行の補完 ---
  let complements = 0
  const charts = [a, b]
  for (const from of [0, 1] as const) {
    const to = (1 - from) as 0 | 1
    for (const e of ELEMENTS) {
      if (complements >= 2) break
      if (charts[to].elements[e] <= ELEMENT_LACK && charts[from].elements[e] >= ELEMENT_RICH) {
        add('element.complement', 'shichu', { from, to, detail: e })
        complements++
      }
    }
  }

  // --- 九星気学：本命星の相生・相剋 ---
  const ka = KYUSEI_ELEMENT_IDX[a.kyusei.honmei]
  const kb = KYUSEI_ELEMENT_IDX[b.kyusei.honmei]
  if (ka === kb) add('kyusei.same', 'kyusei')
  else if (generates(ka, kb)) add('kyusei.gen', 'kyusei', { from: 0, to: 1 })
  else if (generates(kb, ka)) add('kyusei.gen', 'kyusei', { from: 1, to: 0 })
  else if (controls(ka, kb)) add('kyusei.ctrl', 'kyusei', { from: 0, to: 1 })
  else add('kyusei.ctrl', 'kyusei', { from: 1, to: 0 })

  // --- 集計 ---
  const bySystem = { shichu: { work: 0, private: 0 }, kyusei: { work: 0, private: 0 } }
  for (const sys of ['shichu', 'kyusei'] as CompatSystem[]) {
    const fs = factors.filter((f) => f.system === sys)
    bySystem[sys] = {
      work: clamp(BASE_SCORE + fs.reduce((s, f) => s + f.work, 0)),
      private: clamp(BASE_SCORE + fs.reduce((s, f) => s + f.private, 0)),
    }
  }
  const totalWeight = SYSTEM_WEIGHTS.shichu + SYSTEM_WEIGHTS.kyusei
  const combine = (k: 'work' | 'private') =>
    clamp((bySystem.shichu[k] * SYSTEM_WEIGHTS.shichu + bySystem.kyusei[k] * SYSTEM_WEIGHTS.kyusei) / totalWeight)

  const kuubouHits: (0 | 1)[] = []
  if (a.kuubou.includes(BRANCHES[b.pillars.day.branch])) kuubouHits.push(0)
  if (b.kuubou.includes(BRANCHES[a.pillars.day.branch])) kuubouHits.push(1)

  return { work: combine('work'), private: combine('private'), bySystem, factors, kuubouHits }
}
