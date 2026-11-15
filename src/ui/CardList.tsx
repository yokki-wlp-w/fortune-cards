import { useMemo, useState } from 'react'
import { KYUSEI_NAMES } from '../engine'
import { CardFace } from './CardFace'
import { CardForm } from './CardForm'
import { Button } from './common'
import { navigate, useCards } from './hooks'

/** カード一覧（カードゲーム風のグリッド）。検索・タグ絞り込み・追加 */
export function CardList() {
  const cards = useCards()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const allTags = useMemo(() => [...new Set((cards ?? []).flatMap((c) => c.tags))].sort(), [cards])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (cards ?? []).filter((c) => {
      if (tag && !c.tags.includes(tag)) return false
      if (!q) return true
      const d = c.derived
      const haystack = [c.name, c.memo ?? '', c.birthDate, d.animal, d.dayStem, KYUSEI_NAMES[d.kyusei.honmei], ...c.tags]
      return haystack.join(' ').toLowerCase().includes(q)
    })
  }, [cards, query, tag])

  if (!cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前・タグ・動物などで検索"
          aria-label="カードを検索"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
        />
        <Button variant="primary" onClick={() => setAdding(true)}>
          ＋ 追加
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {[null, ...allTags].map((t) => (
            <button
              key={t ?? '__all'}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${
                tag === t ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {t ?? 'すべて'}
            </button>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-5xl" aria-hidden>
            🃏
          </div>
          <p className="mt-3 font-bold">まだカードがありません</p>
          <p className="mt-1 text-sm text-slate-600">名前と生年月日を入れると、人物カードができます。</p>
          <Button variant="primary" className="mt-4" onClick={() => setAdding(true)}>
            最初のカードを追加
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-slate-500">条件に合うカードがありません</p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {shown.length}枚{shown.length !== cards.length && `（全${cards.length}枚）`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shown.map((c) => (
              <CardFace key={c.id} card={c} onClick={() => navigate(`/card/${c.id}`)} />
            ))}
          </div>
        </>
      )}

      {adding && <CardForm knownTags={allTags} onClose={() => setAdding(false)} onSaved={(id) => navigate(`/card/${id}`)} />}
    </div>
  )
}
