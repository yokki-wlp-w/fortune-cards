import { useMemo, useState } from 'react'
import { ROLE_GROUPS, TEAM_MIN_SIZE, computeTeam } from '../engine'
import { ANIMAL_TEXT, ROLE_TEXT, TEAM_ELEMENT_TEXT, teamSuggestions } from '../content'
import type { CardRecord } from '../db/db'
import { ElementChart } from './ElementChart'
import { MemberPicker } from './MemberPicker'
import { Button, Notice, Panel } from './common'
import { navigate, useCards } from './hooks'

const heat = (v: number): string =>
  v >= 80 ? 'bg-emerald-200 text-emerald-950' : v >= 65 ? 'bg-indigo-100 text-indigo-950' : v >= 50 ? 'bg-amber-100 text-amber-950' : 'bg-rose-200 text-rose-950'

function Member({ card }: { card: CardRecord }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-800">
      <span aria-hidden>{ANIMAL_TEXT[card.derived.animal].emoji}</span>
      {card.name}
    </span>
  )
}

/** チーム分析：2人以上を選んで、相性マトリクス・五行と役割の偏り・不足要素・配置の提案を見る */
export function TeamView({ ids }: { ids: string[] }) {
  const cards = useCards()
  const [mode, setMode] = useState<'work' | 'private'>('work')

  const members = useMemo(
    () => ids.map((id) => cards?.find((c) => c.id === id)).filter((c): c is CardRecord => !!c),
    [cards, ids],
  )
  const team = useMemo(
    () => (members.length >= TEAM_MIN_SIZE ? computeTeam(members.map((m) => m.derived)) : null),
    [members],
  )

  if (!cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>
  const setIds = (next: string[]) => navigate(`/team?ids=${next.join(',')}`)

  if (cards.length < TEAM_MIN_SIZE) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-bold">チーム分析には、カードが{TEAM_MIN_SIZE}枚以上必要です</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>
          カードを追加する
        </Button>
      </div>
    )
  }

  const names = members.map((m) => m.name)
  const hasBoundary = members.some((m) => m.derived.boundary)

  return (
    <div className="space-y-4">
      <Panel title={`チーム分析（${TEAM_MIN_SIZE}人以上を選ぶ）`}>
        <MemberPicker cards={cards} selected={members.map((m) => m.id)} onChange={setIds} />
      </Panel>

      {!team ? (
        <p className="py-6 text-center text-sm text-slate-500">メンバーを{TEAM_MIN_SIZE}人以上選ぶと、分析が表示されます。</p>
      ) : (
        <>
          <Panel
            title="相性マトリクス"
            action={
              <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
                {(['work', 'private'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`min-h-8 rounded-full px-3 ${mode === m ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'}`}
                  >
                    {m === 'work' ? '仕事' : 'プライベート'}
                  </button>
                ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1 text-center text-sm">
                <thead>
                  <tr>
                    <th />
                    {members.map((m) => (
                      <th key={m.id} className="min-w-12 max-w-16 px-1 align-bottom text-[11px] font-semibold text-slate-600">
                        <div className="text-lg" aria-hidden>
                          {ANIMAL_TEXT[m.derived.animal].emoji}
                        </div>
                        <div className="truncate">{m.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((row, i) => (
                    <tr key={row.id}>
                      <th className="max-w-24 truncate whitespace-nowrap pr-1 text-right text-xs font-semibold text-slate-700">{row.name}</th>
                      {members.map((col, j) => {
                        const cell = team.matrix[i][j]
                        return (
                          <td key={col.id} className="p-0">
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/compat?a=${row.id}&b=${col.id}`)}
                                aria-label={`${row.name}と${col.name}の相性 ${cell[mode]}点。詳しく見る`}
                                className={`h-11 w-full min-w-12 rounded-lg font-bold tabular-nums ${heat(cell[mode])}`}
                              >
                                {cell[mode]}
                              </button>
                            ) : (
                              <div className="h-11 rounded-lg bg-slate-100 leading-[2.75rem] text-slate-400">—</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                チーム平均：仕事 <strong className="tabular-nums">{team.average.work}</strong>／プライベート{' '}
                <strong className="tabular-nums">{team.average.private}</strong>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              {[
                ['80以上', 80],
                ['65〜79', 65],
                ['50〜64', 50],
                ['49以下', 0],
              ].map(([label, v]) => (
                <span key={label} className={`rounded px-2 py-0.5 ${heat(v as number)}`}>
                  {label}
                </span>
              ))}
              <span>マスを押すと2人の相性の詳細に移ります</span>
            </div>
            {hasBoundary && <p className="mt-2 text-xs text-amber-800">境界日生まれのメンバーは、節入り後の候補で計算しています。</p>}
          </Panel>

          <Panel title="五行の偏り（1人あたりの平均）">
            <ElementChart elements={team.elements} />
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800">
              {team.richElements.map((e) => (
                <li key={`rich-${e}`}>{TEAM_ELEMENT_TEXT[e].rich}</li>
              ))}
              {team.lackElements.map((e) => (
                <li key={`lack-${e}`}>{TEAM_ELEMENT_TEXT[e].lack}</li>
              ))}
              {team.richElements.length + team.lackElements.length === 0 && (
                <li>五行に大きな偏りは見られません。さまざまな場面に対応しやすいバランスです。</li>
              )}
            </ul>
          </Panel>

          <Panel title="役割の偏り">
            <ul className="space-y-3">
              {ROLE_GROUPS.map((role) => (
                <li key={role} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold text-slate-900">{ROLE_TEXT[role].label}</span>
                    <span className="text-xs text-slate-500">月柱の通変星：{ROLE_TEXT[role].stars}</span>
                    <span className="ml-auto text-sm tabular-nums text-slate-600">{team.roles[role].length}人</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{ROLE_TEXT[role].description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {team.roles[role].length === 0 ? (
                      <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500">該当なし</span>
                    ) : (
                      team.roles[role].map((i) => <Member key={members[i].id} card={members[i]} />)
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="不足している要素と補い方">
            {team.missingRoles.length + team.lackElements.length === 0 ? (
              <p className="text-sm text-slate-700">役割・五行ともに、目立った不足は見られません。</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800">
                {team.missingRoles.map((r) => (
                  <li key={r}>{ROLE_TEXT[r].missing}</li>
                ))}
                {team.lackElements.map((e) => (
                  <li key={e}>{TEAM_ELEMENT_TEXT[e].lack}</li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="配置の提案">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-800">
              {teamSuggestions(team, names).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Panel>
          <Notice>配置の提案は、関わり方を考えるための手がかりです。実際の経験・スキル・本人の希望を優先してください。</Notice>
        </>
      )}
    </div>
  )
}
