import { describe, expect, it } from 'vitest'
import { Solar } from 'lunar-typescript'
import {
  animalFaces,
  animalOf,
  branchRelation,
  computeChart,
  computeCompat,
  computeTeam,
  computeYear,
  computeYears,
  palaceOf,
  yearPillar,
  PALACES,
  ROLE_GROUPS,
  getsumeiStar,
  honmeiStar,
  isKango,
  juniun,
  kuubou,
  lifePathNumber,
  termsOfYear,
  tsuhensei,
  STEMS,
  BRANCHES,
} from './index'

const S = (c: string) => STEMS.indexOf(c as (typeof STEMS)[number])
const B = (c: string) => BRANCHES.indexOf(c as (typeof BRANCHES)[number])
const labels = (date: string) => {
  const c = computeChart(date)
  return [c.pillars.year.label, c.pillars.month.label, c.pillars.day.label]
}

describe('節入り（日本時間）', () => {
  const risshun = (y: number) => termsOfYear(y).find((t) => t.name === '立春')!
  it('2021年の立春は2月3日 23:59（124年ぶりの2月3日）', () => {
    const t = risshun(2021)
    expect([t.month, t.day, t.time]).toEqual([2, 3, '23:59'])
  })
  it('1984年の立春は日本時間では2月5日（中国時間では2月4日）', () => {
    const t = risshun(1984)
    expect([t.month, t.day]).toEqual([2, 5])
  })
  it('2024年の立春は2月4日 17:27', () => {
    const t = risshun(2024)
    expect([t.month, t.day, t.time]).toEqual([2, 4, '17:27'])
  })
  it('2025年の立春は2月3日 23:10', () => {
    const t = risshun(2025)
    expect([t.month, t.day, t.time]).toEqual([2, 3, '23:10'])
  })
  it('2024年の大雪は日本時間で12月7日', () => {
    const t = termsOfYear(2024).find((x) => x.name === '大雪')!
    expect([t.month, t.day]).toEqual([12, 7])
  })
  it('各年に12の節がある', () => {
    for (const y of [1901, 1950, 2000, 2099]) expect(termsOfYear(y)).toHaveLength(12)
  })
})

describe('三柱', () => {
  it('2000-01-01 は 己卯・丙子・戊午', () => {
    expect(labels('2000-01-01')).toEqual(['己卯', '丙子', '戊午'])
  })
  it('2024-01-01 の日柱は甲子', () => {
    expect(labels('2024-01-01')[2]).toBe('甲子')
  })
  it('年末年始：年柱は元日では変わらず、日柱だけ進む', () => {
    expect(labels('2023-12-31')).toEqual(['癸卯', '甲子', '癸亥'])
    expect(labels('2024-01-01')).toEqual(['癸卯', '甲子', '甲子'])
  })
  it('うるう年：2024-02-29 と翌日', () => {
    expect(labels('2024-02-29')).toEqual(['甲辰', '丙寅', '癸亥'])
    expect(labels('2024-03-01')).toEqual(['甲辰', '丙寅', '甲子'])
  })
  it('うるう年でない年の 2月29日 はエラー', () => {
    expect(() => computeChart('2023-02-29')).toThrow()
  })
  it('立春前後：2021年', () => {
    expect(labels('2021-02-02').slice(0, 2)).toEqual(['庚子', '己丑'])
    expect(labels('2021-02-04').slice(0, 2)).toEqual(['辛丑', '庚寅'])
  })
  it('立春当日は境界日：主表示は節入り後、候補として節入り前も持つ', () => {
    const c = computeChart('2021-02-03')
    expect(c.boundary?.kind).toBe('risshun')
    expect(c.pillars.year.label).toBe('辛丑')
    expect(c.pillars.month.label).toBe('庚寅')
    expect(c.boundary?.alt.pillars.year.label).toBe('庚子')
    expect(c.boundary?.alt.pillars.month.label).toBe('己丑')
    // 日柱は節入りに関係なく同じ
    expect(c.boundary?.alt.pillars.day.label).toBe(c.pillars.day.label)
  })
  it('1984-02-04 は日本時間では立春前（境界日ではない）', () => {
    const c = computeChart('1984-02-04')
    expect(c.boundary).toBeUndefined()
    expect(c.pillars.year.label).toBe('癸亥')
    expect(computeChart('1984-02-05').boundary?.kind).toBe('risshun')
    expect(computeChart('1984-02-06').pillars.year.label).toBe('甲子')
  })
  it('節入り前後：2024年6月（芒種 6/5）', () => {
    expect(labels('2024-06-04')[1]).toBe('己巳')
    expect(labels('2024-06-06')[1]).toBe('庚午')
    const c = computeChart('2024-06-05')
    expect(c.boundary?.kind).toBe('setsuiri')
    expect(c.boundary?.termName).toBe('芒種')
    expect(c.pillars.month.label).toBe('庚午')
    expect(c.boundary?.alt.pillars.month.label).toBe('己巳')
    expect(c.boundary?.alt.pillars.year.label).toBe('甲辰')
  })

  it('暦ライブラリの命式と一致する（節入りの前後1日を除く全日・複数年）', () => {
    let checked = 0
    for (const year of [1905, 1933, 1958, 1972, 1984, 1990, 2000, 2012, 2024, 2040, 2088]) {
      const skip = new Set<number>()
      for (const t of termsOfYear(year)) {
        const base = Date.UTC(t.year, t.month - 1, t.day)
        for (const off of [-1, 0, 1]) skip.add(base + off * 86400000)
      }
      for (let ms = Date.UTC(year, 0, 1); ms <= Date.UTC(year, 11, 31); ms += 86400000) {
        if (skip.has(ms)) continue
        const dt = new Date(ms)
        const [y, m, d] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()]
        const lunar = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar()
        const expected = [lunar.getYearInGanZhiExact(), lunar.getMonthInGanZhiExact(), lunar.getDayInGanZhi()]
        const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        expect(labels(date), date).toEqual(expected)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(3500)
  })
})

describe('通変星・十二運・空亡', () => {
  it('通変星', () => {
    expect(tsuhensei(S('甲'), S('甲'))).toBe('比肩')
    expect(tsuhensei(S('甲'), S('乙'))).toBe('劫財')
    expect(tsuhensei(S('甲'), S('丙'))).toBe('食神')
    expect(tsuhensei(S('甲'), S('丁'))).toBe('傷官')
    expect(tsuhensei(S('甲'), S('戊'))).toBe('偏財')
    expect(tsuhensei(S('甲'), S('己'))).toBe('正財')
    expect(tsuhensei(S('甲'), S('庚'))).toBe('偏官')
    expect(tsuhensei(S('甲'), S('辛'))).toBe('正官')
    expect(tsuhensei(S('甲'), S('壬'))).toBe('偏印')
    expect(tsuhensei(S('甲'), S('癸'))).toBe('印綬')
    expect(tsuhensei(S('癸'), S('戊'))).toBe('正官')
  })
  it('十二運', () => {
    expect(juniun(S('甲'), B('亥'))).toBe('長生')
    expect(juniun(S('甲'), B('寅'))).toBe('建禄')
    expect(juniun(S('甲'), B('卯'))).toBe('帝旺')
    expect(juniun(S('乙'), B('卯'))).toBe('建禄')
    expect(juniun(S('丙'), B('午'))).toBe('帝旺')
    expect(juniun(S('庚'), B('申'))).toBe('建禄')
    expect(juniun(S('壬'), B('子'))).toBe('帝旺')
    expect(juniun(S('癸'), B('卯'))).toBe('長生')
    expect(juniun(S('戊'), B('午'))).toBe('帝旺')
  })
  it('空亡', () => {
    expect(kuubou(0).map((b) => BRANCHES[b])).toEqual(['戌', '亥']) // 甲子旬
    expect(kuubou(10).map((b) => BRANCHES[b])).toEqual(['申', '酉']) // 甲戌旬
    expect(kuubou(59).map((b) => BRANCHES[b])).toEqual(['子', '丑']) // 癸亥（甲寅旬）
    expect(computeChart('2024-01-01').kuubou).toEqual(['戌', '亥'])
  })
  it('五行バランスの合計は6', () => {
    const e = computeChart('1988-08-08').elements
    const sum = Object.values(e).reduce((a, b) => a + b, 0)
    expect(Math.round(sum * 100) / 100).toBe(6)
  })
})

describe('動物タイプ', () => {
  it('十二運との対応', () => {
    expect(animalOf('胎')).toBe('狼')
    expect(animalOf('絶')).toBe('ペガサス')
  })
  it('日柱から決まる', () => {
    expect(computeChart('2024-01-01').animal).toBe('チータ') // 甲子 = 沐浴
    expect(computeChart('2024-01-02').animal).toBe('たぬき') // 乙丑 = 衰
    expect(computeChart('2024-01-03').animal).toBe('猿') // 丙寅 = 長生
  })
})

describe('動物タイプの3つの顔', () => {
  it('本質=日柱、表面=月柱、意思決定=年柱の十二運から決まる', () => {
    // 2021-02-04：辛丑・庚寅・癸未。日干 癸 から 未=墓、寅=沐浴、丑=冠帯
    const c = computeChart('2021-02-04')
    expect([c.pillars.year.label, c.pillars.month.label, c.pillars.day.label]).toEqual(['辛丑', '庚寅', '癸未'])
    expect(animalFaces(c)).toEqual({ honshitsu: 'ひつじ', hyomen: 'チータ', ishikettei: '黒ひょう' })
    expect(animalFaces(c).honshitsu).toBe(c.animal)
  })
  it('境界日は候補によって表面・意思決定が変わりうるが、本質は変わらない', () => {
    const c = computeChart('2021-02-03')
    expect(animalFaces(c.boundary!.alt).honshitsu).toBe(animalFaces(c).honshitsu)
    expect(animalFaces(c.boundary!.alt).hyomen).not.toBe(animalFaces(c).hyomen)
  })
})

describe('九星気学', () => {
  it('本命星', () => {
    expect(honmeiStar(2024)).toBe(3)
    expect(honmeiStar(2000)).toBe(9)
    expect(honmeiStar(1998)).toBe(2)
    expect(honmeiStar(1999)).toBe(1)
    expect(honmeiStar(1990)).toBe(1)
    expect(honmeiStar(1985)).toBe(6)
  })
  it('月命星', () => {
    expect(getsumeiStar(1, B('寅'))).toBe(8)
    expect(getsumeiStar(3, B('寅'))).toBe(5)
    expect(getsumeiStar(2, B('寅'))).toBe(2)
    expect(getsumeiStar(1, B('戌'))).toBe(9)
  })
  it('立春前は前年の本命星', () => {
    expect(computeChart('2024-02-03').kyusei).toEqual({ honmei: 4, getsumei: 6 })
    expect(computeChart('2024-06-15').kyusei).toEqual({ honmei: 3, getsumei: 1 })
  })
  it('立春当日は本命星も候補が2つ', () => {
    const c = computeChart('2024-02-04')
    expect(c.kyusei.honmei).toBe(3)
    expect(c.boundary?.alt.kyusei.honmei).toBe(4)
  })
})

describe('数秘術', () => {
  it('ライフパスナンバー', () => {
    expect(lifePathNumber(2000, 1, 1)).toBe(4)
    expect(lifePathNumber(1978, 9, 29)).toBe(9)
  })
  it('マスターナンバーは残す', () => {
    expect(lifePathNumber(1990, 12, 25)).toBe(11)
    expect(lifePathNumber(1960, 1, 5)).toBe(22) // 1+9+6+0+0+1+0+5 = 22
    expect(lifePathNumber(1989, 12, 3)).toBe(33) // 1+9+8+9+1+2+0+3 = 33
    expect(lifePathNumber(1982, 11, 9)).toBe(4) // 31 → 4（途中でマスターナンバーにならない）
  })
})

describe('年運', () => {
  it('流年の干支', () => {
    expect(yearPillar(2024).label).toBe('甲辰')
    expect(yearPillar(2026).label).toBe('丙午')
    expect(yearPillar(1984).label).toBe('甲子')
  })
  it('九星の年盤での回座位置', () => {
    // 五黄が中宮の年（定位盤）：六白=乾、七赤=兌、八白=艮、九紫=離、一白=坎、二黒=坤、三碧=震、四緑=巽
    const y = 2022 // 五黄土星の年
    expect(honmeiStar(y)).toBe(5)
    expect([5, 6, 7, 8, 9, 1, 2, 3, 4].map((h) => palaceOf(h, y))).toEqual([...PALACES])
    // 2026年は一白水星が中宮
    expect(honmeiStar(2026)).toBe(1)
    expect(palaceOf(1, 2026)).toBe('中宮')
    expect(palaceOf(2, 2026)).toBe('乾宮')
    expect(palaceOf(9, 2026)).toBe('巽宮')
  })
  it('通変星・十二運・冲・空亡を拾う', () => {
    // 2024-01-01 生まれ：癸卯・甲子・甲子、空亡は戌亥
    const c = computeChart('2024-01-01')
    const y2026 = computeYear(c, 2026) // 丙午：甲から丙=食神、午=死、子と午は冲
    expect(y2026.tsuhensei).toBe('食神')
    expect(y2026.juniun).toBe('死')
    expect(y2026.relations.filter((r) => r.relation === 'chu').map((r) => r.position)).toEqual(['day', 'month'])
    expect(y2026.kuubou).toBe(false)
    expect(computeYear(c, 2030).kuubou).toBe(true) // 庚戌
    expect(computeYear(c, 2029).kango).toBe(true) // 己酉：甲己の干合
  })
  it('複数年を連続で返し、段階は3種類のいずれか', () => {
    const ys = computeYears(computeChart('1990-05-15'), 2026, 10)
    expect(ys.map((y) => y.year)).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035])
    for (const y of ys) expect(['active', 'steady', 'careful']).toContain(y.level)
  })
})

describe('チーム分析', () => {
  const dates = ['1985-04-12', '1990-11-03', '1978-09-29', '2001-03-04']
  const team = computeTeam(dates.map((d) => computeChart(d)))
  it('相性マトリクスは対称で、対角は空', () => {
    expect(team.size).toBe(4)
    expect(team.pairs).toHaveLength(6)
    for (let i = 0; i < 4; i++) {
      expect(team.matrix[i][i]).toBeNull()
      for (let j = 0; j < 4; j++) expect(team.matrix[i][j]).toEqual(team.matrix[j][i])
    }
    expect(team.bestPair.work).toBe(Math.max(...team.pairs.map((p) => p.work)))
  })
  it('五行の平均は合計6、役割は全員がどこかに入る', () => {
    const sum = Object.values(team.elements).reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 6)).toBeLessThan(0.3)
    expect(ROLE_GROUPS.flatMap((r) => team.roles[r]).sort()).toEqual([0, 1, 2, 3])
    expect(team.missingRoles.every((r) => team.roles[r].length === 0)).toBe(true)
  })
  it('間に入る人は、注意が必要な2人以外から選ぶ', () => {
    if (team.cautionPair) {
      expect([team.cautionPair.a, team.cautionPair.b]).not.toContain(team.mediator)
      expect(team.cautionPair.work).toBeLessThan(55)
    } else {
      expect(team.mediator).toBeUndefined()
    }
  })
  it('2人以下はエラー', () => {
    expect(() => computeTeam(dates.slice(0, 2).map((d) => computeChart(d)))).toThrow()
  })
})

describe('相性', () => {
  it('干合', () => {
    expect(isKango(S('甲'), S('己'))).toBe(true)
    expect(isKango(S('戊'), S('癸'))).toBe(true)
    expect(isKango(S('甲'), S('甲'))).toBe(false)
    expect(isKango(S('甲'), S('庚'))).toBe(false)
  })
  it('地支の関係', () => {
    expect(branchRelation(B('子'), B('丑'))).toBe('rikugo')
    expect(branchRelation(B('子'), B('午'))).toBe('chu')
    expect(branchRelation(B('申'), B('辰'))).toBe('sango')
    expect(branchRelation(B('子'), B('卯'))).toBe('kei')
    expect(branchRelation(B('子'), B('未'))).toBe('gai')
    expect(branchRelation(B('巳'), B('申'))).toBe('rikugo')
    expect(branchRelation(B('子'), B('子'))).toBe('same')
    expect(branchRelation(B('子'), B('寅'))).toBeNull()
  })
  it('スコアは範囲内で、入れ替えても同じ', () => {
    const a = computeChart('1985-04-12')
    const b = computeChart('1990-11-03')
    const r1 = computeCompat(a, b)
    const r2 = computeCompat(b, a)
    for (const v of [r1.work, r1.private]) {
      expect(v).toBeGreaterThanOrEqual(20)
      expect(v).toBeLessThanOrEqual(98)
    }
    expect([r1.work, r1.private]).toEqual([r2.work, r2.private])
    expect(r1.factors.some((f) => f.system === 'kyusei')).toBe(true)
  })
})
