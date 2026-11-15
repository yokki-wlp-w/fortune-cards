// 生年月日から命式（年・月・日の三柱）と各占術の属性を算出する。
import {
  BRANCHES,
  BRANCH_ELEMENT_IDX,
  ELEMENTS,
  HIDDEN_STEMS,
  HIDDEN_WEIGHTS,
  STEMS,
  juniun,
  kuubou,
  sexagenaryIndex,
  stemElementIdx,
  tsuhensei,
  type Element,
} from './tables'
import { daySexagenary, termsOfYear, type Term } from './calendar'
import { honmeiStar, getsumeiStar } from './kyusei'
import { animalOf } from './animal'
import { lifePathNumber } from './numerology'

export const ENGINE_VERSION = '1.0.0'
export const MIN_YEAR = 1901
export const MAX_YEAR = 2099

export interface Pillar {
  stem: number
  branch: number
  /** 例: "甲子" */
  label: string
}

export interface ChartCore {
  /** 立春を年の始まりとした年 */
  solarYear: number
  pillars: { year: Pillar; month: Pillar; day: Pillar }
  dayStem: string
  /** 五行バランス（三柱の天干3 + 地支3 = 合計6） */
  elements: Record<Element, number>
  /** 通変星。地支は蔵干の本気で引く。日支は日干自身との関係 */
  tsuhensei: { yearStem: string; monthStem: string; yearBranch: string; monthBranch: string; dayBranch: string }
  /** 十二運（日干から各柱の地支に引く） */
  juniun: { year: string; month: string; day: string }
  /** 蔵干（本気・中気・余気の順） */
  zokan: { year: string[]; month: string[]; day: string[] }
  /** 空亡（天中殺）の地支 */
  kuubou: [string, string]
  kyusei: { honmei: number; getsumei: number }
  /** 動物タイプ（日柱の十二運から決まる12動物） */
  animal: string
}

export interface Boundary {
  /** risshun: 立春当日（年柱・本命星も変わる） / setsuiri: その他の節入り当日（月柱・月命星が変わる） */
  kind: 'risshun' | 'setsuiri'
  termName: string
  /** 日本時間の節入り時刻 "HH:MM" */
  timeJst: string
  /** 節入り「前」に生まれていた場合の命式。主表示は節入り「後」 */
  alt: ChartCore
}

export interface DerivedChart extends ChartCore {
  lifePath: number
  boundary?: Boundary
}

const pillar = (stem: number, branch: number): Pillar => ({ stem, branch, label: STEMS[stem] + BRANCHES[branch] })

export function parseDate(birthDate: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) throw new Error('生年月日は YYYY-MM-DD 形式で指定してください')
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const check = new Date(Date.UTC(y, m - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new Error('存在しない日付です')
  }
  if (y < MIN_YEAR || y > MAX_YEAR) throw new Error(`${MIN_YEAR}年〜${MAX_YEAR}年の範囲で指定してください`)
  return { y, m, d }
}

/**
 * @param afterTerm 節入り当日の生まれを「節入り後」として扱うか
 */
function computeCore(y: number, m: number, d: number, afterTerm: boolean): ChartCore {
  const ord = y * 10000 + m * 100 + d
  const terms: Term[] = [...termsOfYear(y - 1), ...termsOfYear(y)]
  const started = (t: Term) => (afterTerm ? t.ord <= ord : t.ord < ord)

  // 月支：直近に始まった節で決まる
  let current: Term | undefined
  for (const t of terms) if (started(t)) current = t
  if (!current) throw new Error('節入りを特定できません')
  const monthBranch = current.branch

  // 年：その年の立春を過ぎていれば当年、まだなら前年
  const risshun = termsOfYear(y).find((t) => t.name === '立春')!
  const solarYear = started(risshun) ? y : y - 1
  const yearIdx = (((solarYear - 4) % 60) + 60) % 60
  const year = pillar(yearIdx % 10, yearIdx % 12)

  // 月干：年干から寅月の干が決まり、以降ひと月ごとに進む
  const firstMonthStem = ((year.stem % 5) * 2 + 2) % 10
  const monthStem = (firstMonthStem + ((monthBranch - 2 + 12) % 12)) % 10
  const month = pillar(monthStem, monthBranch)

  const dayIdx = daySexagenary(y, m, d)
  const day = pillar(dayIdx % 10, dayIdx % 12)

  // 五行バランス
  const el = [0, 0, 0, 0, 0]
  for (const p of [year, month, day]) {
    el[stemElementIdx(p.stem)] += 1
    const hidden = HIDDEN_STEMS[p.branch]
    const weights = HIDDEN_WEIGHTS[hidden.length]
    hidden.forEach((s, i) => (el[stemElementIdx(s)] += weights[i]))
  }
  const elements = Object.fromEntries(ELEMENTS.map((e, i) => [e, Math.round(el[i] * 100) / 100])) as Record<
    Element,
    number
  >

  const main = (branch: number) => HIDDEN_STEMS[branch][0]
  const zokanOf = (branch: number) => HIDDEN_STEMS[branch].map((s) => STEMS[s])
  const kb = kuubou(sexagenaryIndex(day.stem, day.branch))
  const honmei = honmeiStar(solarYear)
  const dayJuniun = juniun(day.stem, day.branch)

  return {
    solarYear,
    pillars: { year, month, day },
    dayStem: STEMS[day.stem],
    elements,
    tsuhensei: {
      yearStem: tsuhensei(day.stem, year.stem),
      monthStem: tsuhensei(day.stem, month.stem),
      yearBranch: tsuhensei(day.stem, main(year.branch)),
      monthBranch: tsuhensei(day.stem, main(month.branch)),
      dayBranch: tsuhensei(day.stem, main(day.branch)),
    },
    juniun: { year: juniun(day.stem, year.branch), month: juniun(day.stem, month.branch), day: dayJuniun },
    zokan: { year: zokanOf(year.branch), month: zokanOf(month.branch), day: zokanOf(day.branch) },
    kuubou: [BRANCHES[kb[0]], BRANCHES[kb[1]]],
    kyusei: { honmei, getsumei: getsumeiStar(honmei, monthBranch) },
    animal: animalOf(dayJuniun),
  }
}

/** 生年月日 (YYYY-MM-DD) から人物カード用の算出結果を返す */
export function computeChart(birthDate: string): DerivedChart {
  const { y, m, d } = parseDate(birthDate)
  const ord = y * 10000 + m * 100 + d
  const core = computeCore(y, m, d, true)
  const chart: DerivedChart = { ...core, lifePath: lifePathNumber(y, m, d) }

  // 節入り当日は出生時刻がないと月柱（立春なら年柱も）が確定しない
  const term = termsOfYear(y).find((t) => t.ord === ord)
  if (term) {
    chart.boundary = {
      kind: term.name === '立春' ? 'risshun' : 'setsuiri',
      termName: term.name,
      timeJst: term.time,
      alt: computeCore(y, m, d, false),
    }
  }
  return chart
}

/** 命式の五行インデックスなどを使う他モジュール向けの補助 */
export const dayStemElementIdx = (c: ChartCore): number => stemElementIdx(c.pillars.day.stem)
export const branchElementIdx = (branch: number): number => BRANCH_ELEMENT_IDX[branch]
