import { useMemo, useState } from 'react'
import { computeYears, type YearLevel } from '../engine'
import { ANIMAL_TEXT, YEAR_LEVEL_TEXT, describeYear } from '../content'
import type { CardRecord } from '../db/db'
import { MemberPicker } from './MemberPicker'
import { Button, Notice, Panel } from './common'
import { navigate, useCards } from './hooks'

const LEVEL_STYLE: Record<YearLevel, { cell: string; chip: string }> = {
  active: { cell: 'bg-emerald-100 text-emerald-950', chip: 'bg-emerald-600 text-white' },
  steady: { cell: 'bg-slate-100 text-slate-900', chip: 'bg-slate-500 text-white' },
  careful: { cell: 'bg-amber-100 text-amber-950', chip: 'bg-amber-500 text-white' },
}
const TONE_STYLE = { good: 'border-emerald-400', caution: 'border-amber-400', neutral: 'border-slate-300' }
const SPANS = [5, 10, 15]

/** 年運タイムライン：指定した年から複数年分。複数人を並べて比較できる */
export function YearlyView({ ids, from, span }: { ids: string[]; from: number; span: number }) {
  const cards = useCards()
  const [focusId, setFocusId] = useState<string | null>(null)

  const members = useMemo(
    () => ids.map((id) => cards?.find((c) => c.id === id)).filter((c): c is CardRecord => !!c),
    [cards, ids],
  )
  const table = useMemo(() => members.map((m) => computeYears(m.derived, from, span)), [members, from, span])

  if (!cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>
  const go = (nextIds: string[], nextFrom = from, nextSpan = span) =>
    navigate(`/yearly?ids=${nextIds.join(',')}&from=${nextFrom}&n=${nextSpan}`)
  const memberIds = members.map((m) => m.id)

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-bold">年運を見るには、カードが必要です</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>
          カードを追加する
        </Button>
      </div>
    )
  }

  const focusIndex = Math.max(0, members.findIndex((m) => m.id === focusId))
  const focus = members[focusIndex]
  const years = table[0]?.map((y) => y.year) ?? []

  return (
    <div className="space-y-4">
      <Panel title="年運タイムライン">
        <MemberPicker cards={cards} selected={memberIds} onChange={(next) => go(next)} />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">開始年</span>
            <input
              type="number"
              inputMode="numeric"
              value={from}
              min={1950}
              max={2090}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isInteger(v) && v >= 1950 && v <= 2090) go(memberIds, v)
              }}
              className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <div>
            <span className="text-xs font-semibold text-slate-600">年数</span>
            <div className="mt-1 flex rounded-xl bg-slate-100 p-0.5 text-sm font-semibold">
              {SPANS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={span === n}
                  onClick={() => go(memberIds, from, n)}
                  className={`min-h-10 rounded-lg px-3 ${span === n ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'}`}
                >
                  {n}年
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">1年の始まりは立春（2月4日ごろ）です。1月〜立春前は、前の年の運気として見ます。</p>
      </Panel>

      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">カードを1人以上選ぶと、年運が表示されます。</p>
      ) : (
        <>
          <Panel title={members.length > 1 ? '比較表' : '一覧'}>
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1 text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-1 text-left font-semibold text-slate-500">年</th>
                    {members.map((m, i) => (
                      <th key={m.id} className="min-w-20 p-0">
                        <button
                          type="button"
                          aria-pressed={i === focusIndex}
                          onClick={() => setFocusId(m.id)}
                          className={`w-full rounded-lg px-1 py-1 font-semibold ${i === focusIndex ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                          <span className="text-base" aria-hidden>
                            {ANIMAL_TEXT[m.derived.animal].emoji}
                          </span>
                          <span className="block max-w-24 truncate">{m.name}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {years.map((year, yi) => (
                    <tr key={year}>
                      <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-1 text-left font-semibold text-slate-700">
                        {year}
                        <span className="ml-1 font-normal text-slate-500">{table[0][yi].pillar.label}</span>
                      </th>
                      {table.map((row, mi) => {
                        const y = row[yi]
                        return (
                          <td key={members[mi].id} className={`rounded-lg px-1 py-1.5 ${LEVEL_STYLE[y.level].cell}`}>
                            <div className="font-bold">{YEAR_LEVEL_TEXT[y.level].label}</div>
                            <div className="text-[11px] opacity-80">
                              {y.tsuhensei}・{y.juniun}
                            </div>
                            <div className="text-[11px] opacity-80">
                              {y.kyusei.palace}
                              {y.kuubou && '・空亡'}
                              {y.relations.some((r) => r.relation === 'chu') && '・冲'}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {(Object.keys(YEAR_LEVEL_TEXT) as YearLevel[]).map((l) => (
                <span key={l} className={`rounded px-2 py-0.5 ${LEVEL_STYLE[l].cell}`}>
                  {YEAR_LEVEL_TEXT[l].label}
                </span>
              ))}
              {members.length > 1 && <span className="text-slate-600">名前を押すと、その人の詳細が下に表示されます</span>}
            </div>
          </Panel>

          <Panel title={`${focus.name}さんの年ごとの傾向`}>
            {focus.derived.boundary && (
              <p className="mb-3 text-xs text-amber-800">境界日生まれのため、節入り後の候補で計算しています。</p>
            )}
            <ol className="space-y-4">
              {table[focusIndex].map((y) => (
                <li key={y.year} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black tabular-nums text-slate-900">{y.year}年</span>
                    <span className="text-sm text-slate-600">{y.pillar.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[y.level].chip}`}>
                      {YEAR_LEVEL_TEXT[y.level].label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800">{YEAR_LEVEL_TEXT[y.level].text}</p>
                  <ul className="mt-2 space-y-1.5">
                    {describeYear(y).map((line) => (
                      <li key={line.label} className={`border-l-4 pl-2 text-sm leading-relaxed ${TONE_STYLE[line.tone]}`}>
                        <span className="block text-xs font-semibold text-slate-500">{line.label}</span>
                        <span className="text-slate-800">{line.text}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Panel>
          <Notice>
            年運は、その年の過ごし方を考えるための手がかりです。「整える年」は悪い年という意味ではなく、準備や見直しに向く時期を示しています。
          </Notice>
        </>
      )}
    </div>
  )
}
