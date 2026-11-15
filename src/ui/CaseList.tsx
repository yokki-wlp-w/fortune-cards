import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CASE_KIND_LABEL, USEFULNESS_KEYS, USEFULNESS_LABEL, buildCaseSnapshot } from '../content'
import { db, type CardRecord, type CaseKind, type CaseRecord, type Usefulness } from '../db/db'
import { CaseForm, type CaseDraft } from './CaseForm'
import { Button, Panel, formatDate } from './common'
import { navigate, useCards } from './hooks'

/** 削除されていないケース（実施日の新しい順） */
export function useCases(): CaseRecord[] | undefined {
  return useLiveQuery(async () =>
    (await db.cases.toArray()).filter((c) => !c.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
  )
}

/** 「記録」画面の中の切り替え（的中率／ケース） */
export function RecordsTabs({ active }: { active: 'stats' | 'cases' }) {
  return (
    <div className="flex rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
      {(
        [
          ['stats', '/stats', '的中率'],
          ['cases', '/cases', 'ケース'],
        ] as const
      ).map(([key, to, label]) => (
        <button
          key={key}
          type="button"
          aria-current={active === key ? 'page' : undefined}
          onClick={() => navigate(to)}
          className={`min-h-10 flex-1 rounded-full ${active === key ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 分析画面に置く「ケースとして記録」ボタン。押すと、対象と分析結果を控えた記録フォームを開く */
export function RecordCaseButton({ kind, members, className }: { kind: CaseKind; members: CardRecord[]; className?: string }) {
  const cards = useCards()
  const cases = useCases()
  const [draft, setDraft] = useState<CaseDraft | null>(null)
  const related = (cases ?? []).filter(
    (c) => c.kind === kind && c.memberIds.length === members.length && members.every((m) => c.memberIds.includes(m.id)),
  ).length

  const open = () =>
    setDraft({
      kind,
      memberIds: members.map((m) => m.id),
      snapshot: buildCaseSnapshot(kind, members.map((m) => ({ name: m.name, chart: m.derived }))),
    })

  return (
    <>
      <Button className={className} onClick={open}>
        📝 ケースとして記録{related > 0 && `（記録済み ${related}件）`}
      </Button>
      {draft && <CaseForm draft={draft} cards={cards ?? []} knownTags={[...new Set((cases ?? []).flatMap((c) => c.tags))]} onClose={() => setDraft(null)} />}
    </>
  )
}

const USEFULNESS_CHIP: Record<Usefulness, string> = {
  useful: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  notUseful: 'bg-rose-100 text-rose-800',
}

/** ケーススタディの一覧。検索・絞り込み・編集 */
export function CaseList() {
  const cards = useCards()
  const cases = useCases()
  const [query, setQuery] = useState('')
  const [usefulness, setUsefulness] = useState<Usefulness | 'none' | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [editing, setEditing] = useState<CaseRecord | null>(null)

  const nameOf = useMemo(() => {
    const map = new Map((cards ?? []).map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? '（削除済み）'
  }, [cards])
  const allTags = useMemo(() => [...new Set((cases ?? []).flatMap((c) => c.tags))].sort(), [cases])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (cases ?? []).filter((c) => {
      if (tag && !c.tags.includes(tag)) return false
      if (usefulness === 'none' ? c.usefulness !== undefined : usefulness && c.usefulness !== usefulness) return false
      if (!q) return true
      const haystack = [c.title, c.scene, c.reading, c.outcome, c.learning, c.date, ...c.tags, ...c.memberIds.map(nameOf)]
      return haystack.join(' ').toLowerCase().includes(q)
    })
  }, [cases, query, tag, usefulness, nameOf])

  if (!cases || !cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>

  const counts = USEFULNESS_KEYS.map((u) => cases.filter((c) => c.usefulness === u).length)
  const rated = counts.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <RecordsTabs active="cases" />

      {cases.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-5xl" aria-hidden>
            📝
          </div>
          <p className="mt-3 font-bold">まだケースがありません</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            相性・チーム・カード詳細の画面にある「ケースとして記録」ボタンから、
            <br className="hidden sm:block" />
            その分析を使った場面と、実際にどうなったかを残せます。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate('/compat')}>相性へ</Button>
            <Button onClick={() => navigate('/team')}>チームへ</Button>
          </div>
        </div>
      ) : (
        <>
          <Panel title="ケースのまとめ">
            <p className="text-sm text-slate-700">
              全 <strong className="tabular-nums">{cases.length}</strong> 件（評価済み {rated} 件）
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {USEFULNESS_KEYS.map((u, i) => (
                <span key={u} className={`rounded-full px-2.5 py-1 font-semibold ${USEFULNESS_CHIP[u]}`}>
                  {USEFULNESS_LABEL[u]} {counts[i]}
                </span>
              ))}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">未評価 {cases.length - rated}</span>
            </div>
          </Panel>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・本文・名前・タグで検索"
            aria-label="ケースを検索"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          />
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {(
              [
                [null, 'すべて'],
                ...USEFULNESS_KEYS.map((u) => [u, USEFULNESS_LABEL[u]] as const),
                ['none', '未評価'],
              ] as [Usefulness | 'none' | null, string][]
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={usefulness === value}
                onClick={() => setUsefulness(value)}
                className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${usefulness === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                {label}
              </button>
            ))}
            {allTags.map((t) => (
              <button
                key={`tag-${t}`}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${tag === t ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                #{t}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-8 text-center text-slate-500">条件に合うケースがありません</p>
          ) : (
            <ul className="space-y-3">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">{CASE_KIND_LABEL[c.kind]}</span>
                      <span className="text-slate-500">{formatDate(c.date)}</span>
                      {c.usefulness ? (
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${USEFULNESS_CHIP[c.usefulness]}`}>{USEFULNESS_LABEL[c.usefulness]}</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">未評価</span>
                      )}
                    </div>
                    <div className="mt-1 text-base font-bold text-slate-900">{c.title}</div>
                    <div className="text-sm text-slate-600">{c.memberIds.map(nameOf).join('・')}</div>
                    {(
                      [
                        ['場面', c.scene],
                        ['見立て', c.reading],
                        ['実際', c.outcome],
                        ['学び', c.learning],
                      ] as const
                    )
                      .filter(([, text]) => text)
                      .map(([label, text]) => (
                        <p key={label} className="mt-1.5 text-sm leading-relaxed text-slate-800">
                          <span className="mr-1.5 text-xs font-bold text-slate-500">{label}</span>
                          <span className="whitespace-pre-wrap">{text}</span>
                        </p>
                      ))}
                    {!c.outcome && <p className="mt-1.5 text-xs text-amber-700">「実際に起きたこと」は未記入です。押すと追記できます。</p>}
                    {c.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {editing && <CaseForm record={editing} cards={cards} knownTags={allTags} onClose={() => setEditing(null)} />}
    </div>
  )
}
