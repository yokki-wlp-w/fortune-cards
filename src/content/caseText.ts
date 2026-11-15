// ケーススタディの表示用ラベルと、記録時点の分析結果の控え（スナップショット）を作る。
import { ENGINE_VERSION, KYUSEI_NAMES, animalFaces, computeCompat, computeTeam, type ChartCore, type RoleGroup } from '../engine'
import { describeFactor } from './compatText'
import { ROLE_TEXT } from './teamText'

export const CASE_KIND_LABEL = { person: '個人', pair: '2人（相性）', team: 'チーム' } as const
export const USEFULNESS_LABEL = { useful: '役立った', partial: '一部役立った', notUseful: '役立たなかった' } as const
export const USEFULNESS_KEYS = ['useful', 'partial', 'notUseful'] as const

export interface CaseMember {
  name: string
  chart: ChartCore
}

const personLine = (m: CaseMember): string => {
  const f = animalFaces(m.chart)
  return `${m.name}：日干 ${m.chart.dayStem}／動物 本質 ${f.honshitsu}・表面 ${f.hyomen}・意思決定 ${f.ishikettei}／本命星 ${KYUSEI_NAMES[m.chart.kyusei.honmei]}／月柱の通変星 ${m.chart.tsuhensei.monthBranch}`
}

/** 記録した時点の分析結果を、文章の行として控える。後から配点が変わっても当時の内容が残る */
export function buildCaseSnapshot(kind: 'person' | 'pair' | 'team', members: CaseMember[]): string[] {
  const lines: string[] = []
  if (kind === 'pair' && members.length === 2) {
    const [a, b] = members
    const r = computeCompat(a.chart, b.chart)
    const texts = r.factors.map((f) => describeFactor(f, [a.name, b.name]))
    lines.push(`相性スコア：仕事 ${r.work}点／プライベート ${r.private}点`)
    lines.push(`内訳：四柱推命 ${r.bySystem.shichu.work}・${r.bySystem.shichu.private}／九星気学 ${r.bySystem.kyusei.work}・${r.bySystem.kyusei.private}（仕事・プライベート）`)
    const good = texts.filter((t) => t.tone === 'good').map((t) => t.title)
    const caution = texts.filter((t) => t.tone === 'caution').map((t) => t.title)
    if (good.length) lines.push(`噛み合う点：${good.join(' ／ ')}`)
    if (caution.length) lines.push(`揉めやすい点：${caution.join(' ／ ')}`)
  }
  if (kind === 'team' && members.length >= 2) {
    const t = computeTeam(members.map((m) => m.chart))
    lines.push(`チーム平均：仕事 ${t.average.work}点／プライベート ${t.average.private}点（${t.size}人）`)
    const roles = (Object.keys(t.roles) as RoleGroup[])
      .filter((r) => t.roles[r].length > 0)
      .map((r) => `${ROLE_TEXT[r].label} ${t.roles[r].map((i) => members[i].name).join('・')}`)
    lines.push(`役割：${roles.join('／')}`)
    if (t.missingRoles.length) lines.push(`不足している役割：${t.missingRoles.map((r) => ROLE_TEXT[r].label).join('・')}`)
    if (t.richElements.length) lines.push(`多い五行：${t.richElements.join('・')}`)
    if (t.lackElements.length) lines.push(`少ない五行：${t.lackElements.join('・')}`)
    lines.push(`最も噛み合う組み合わせ：${members[t.bestPair.a].name} × ${members[t.bestPair.b].name}（仕事 ${t.bestPair.work}点）`)
    if (t.cautionPair) {
      lines.push(`ぶつかりやすい組み合わせ：${members[t.cautionPair.a].name} × ${members[t.cautionPair.b].name}（仕事 ${t.cautionPair.work}点）`)
    }
  }
  for (const m of members) lines.push(personLine(m))
  lines.push(`計算エンジン v${ENGINE_VERSION}`)
  return lines
}
