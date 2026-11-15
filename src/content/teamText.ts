// チーム分析の文章。すべて自作。不足は「補い方」とセットで書く。
import type { Element, RoleGroup, TeamResult } from '../engine'

export interface RoleText {
  label: string
  /** 対応する通変星 */
  stars: string
  description: string
  /** この役割の人がいないときの補い方 */
  missing: string
}

export const ROLE_TEXT: Record<RoleGroup, RoleText> = {
  hikaku: {
    label: '推進役',
    stars: '比肩・劫財',
    description: '自分の判断で動き、決めたことをやり切る役割を担いやすいタイプです。',
    missing: '推進役が少なめです。担当と期限をはっきり決め、「誰が最後までやるか」を明確にすると進みやすくなります。',
  },
  shokusho: {
    label: '発想役',
    stars: '食神・傷官',
    description: 'アイデアを出し、表現や改善で場を動かす役割を担いやすいタイプです。',
    missing: '発想役が少なめです。結論を急がず案を出し合う時間を設ける、外部の事例を持ち込むなどで補えます。',
  },
  zai: {
    label: '実務・調整役',
    stars: '偏財・正財',
    description: '人や数字を扱い、現実的に段取りを整える役割を担いやすいタイプです。',
    missing: '実務・調整役が少なめです。予算、日程、関係者への連絡を担当として切り出しておくと安心です。',
  },
  kan: {
    label: 'まとめ役',
    stars: '偏官・正官',
    description: '規律や責任を重んじ、チームをまとめて前に進める役割を担いやすいタイプです。',
    missing: 'まとめ役が少なめです。ルールや決め方をあらかじめ文章にし、最終判断をする人を決めておくと混乱を防げます。',
  },
  in: {
    label: '分析・参謀役',
    stars: '偏印・印綬',
    description: '調べて考え、知識を整理して助言する役割を担いやすいタイプです。',
    missing: '分析・参謀役が少なめです。動く前に情報を集める時間と、振り返りの場を意識して設けると補えます。',
  },
}

/** チーム全体の五行の偏りについてのコメント */
export const TEAM_ELEMENT_TEXT: Record<Element, { rich: string; lack: string }> = {
  木: {
    rich: '木（成長・企画）が多いチームです。新しいことを始める力がある一方、手を広げすぎないよう優先順位を決めておくとよさそうです。',
    lack: '木（成長・企画）が少なめです。新しい企画や長期の目標は、定期的に話し合う場を設けて補うとよさそうです。',
  },
  火: {
    rich: '火（表現・情熱）が多いチームです。盛り上がる力がある一方、熱が冷めたあとの継続の仕組みを用意しておくと安心です。',
    lack: '火（表現・情熱）が少なめです。成果や感謝を言葉にして伝え合う機会を、意識して増やすとよさそうです。',
  },
  土: {
    rich: '土（安定・信頼）が多いチームです。堅実に進められる一方、変化への対応が遅れないよう、見直しの節目を決めておくとよさそうです。',
    lack: '土（安定・信頼）が少なめです。手順や記録を残し、土台になるルールを先に決めておくと安定します。',
  },
  金: {
    rich: '金（決断・実行）が多いチームです。決めて動く力がある一方、意見がぶつかりやすいので、決め方を先に合意しておくとよさそうです。',
    lack: '金（決断・実行）が少なめです。期限と決定者を明確にし、「いつ決めるか」を先に決めておくと前に進みやすくなります。',
  },
  水: {
    rich: '水（知性・柔軟）が多いチームです。考える力がある一方、検討が長引きやすいので、試しに動く期限を決めておくとよさそうです。',
    lack: '水（知性・柔軟）が少なめです。情報収集と振り返りの時間を予定に組み込み、状況に応じて見直す習慣を持つとよさそうです。',
  },
}

const roleName = (team: TeamResult, member: number): RoleGroup =>
  (Object.keys(team.roles) as RoleGroup[]).find((r) => team.roles[r].includes(member))!

/** 配置の提案を文章にする */
export function teamSuggestions(team: TeamResult, names: string[]): string[] {
  const lines: string[] = []
  const best = team.bestPair
  if (team.size === 2) {
    // 2人のときは「つなぎ役」「間に入る人」が成り立たないので、2人の関係だけを述べる
    lines.push(
      `${names[0]}さんと${names[1]}さんの相性は、仕事 ${best.work}点、プライベート ${best.private}点です。噛み合う点と揉めやすい点は、相性マトリクスのマスを押すと詳しく見られます。`,
    )
    if (team.cautionPair) {
      lines.push('進め方がぶつかりやすい組み合わせです。役割と決め方を先に言葉にしておくと、違いを補い合う関係にしやすくなります。')
    }
    const shared = (Object.keys(team.roles) as RoleGroup[]).find((r) => team.roles[r].length === 2)
    lines.push(
      shared
        ? `2人とも${ROLE_TEXT[shared].label}のタイプです。得意が重なるぶん、担当範囲を分けておくとよさそうです。`
        : `${names[0]}さんは${ROLE_TEXT[roleName(team, 0)].label}、${names[1]}さんは${ROLE_TEXT[roleName(team, 1)].label}のタイプです。それぞれの得意を活かして分担すると進めやすいようです。`,
    )
    return lines
  }
  lines.push(
    `${names[team.hub]}さんは、他のメンバーとの仕事の相性の平均が最も高く（${team.memberAverage[team.hub]}点）、人と人をつなぐ位置に置くと全体が回りやすい傾向があります。`,
  )
  lines.push(
    `${names[best.a]}さんと${names[best.b]}さんは、仕事の相性が最も高い組み合わせです（${best.work}点）。立ち上げや難しい課題など、連携が要る場面で組むと力を出しやすいようです。`,
  )
  if (team.cautionPair) {
    const c = team.cautionPair
    const mediator = team.mediator !== undefined ? names[team.mediator] : undefined
    lines.push(
      `${names[c.a]}さんと${names[c.b]}さんは、進め方がぶつかりやすい組み合わせです（${c.work}点）。役割と決め方を先に言葉にしておくと、違いを補い合う関係にしやすくなります。` +
        (mediator ? `どちらとも噛み合いやすい${mediator}さんが間に入ると、やり取りが滑らかになりやすいようです。` : ''),
    )
  }
  // 不足している役割の補い方は「不足している要素と補い方」に表示するため、ここでは繰り返さない
  const crowded = (Object.keys(team.roles) as RoleGroup[]).filter((r) => team.roles[r].length >= Math.max(3, Math.ceil(team.size * 0.6)))
  for (const role of crowded) {
    lines.push(
      `${ROLE_TEXT[role].label}のタイプが${team.roles[role].length}人と多めです。同じ役割で重ならないよう、担当範囲を分けておくとよさそうです。`,
    )
  }
  return lines
}
