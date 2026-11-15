import { useMemo } from 'react'
import { ANIMAL_TEXT } from '../content'
import type { CardRecord } from '../db/db'

/** カードを複数選ぶための部品（チーム分析・年運で使う） */
export function MemberPicker({
  cards,
  selected,
  onChange,
}: {
  cards: CardRecord[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const tags = useMemo(() => [...new Set(cards.flatMap((c) => c.tags))].sort(), [cards])
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">まとめて選ぶ：</span>
        <button type="button" onClick={() => onChange(cards.map((c) => c.id))} className="min-h-8 rounded-full border border-slate-300 bg-white px-2.5 text-slate-700">
          全員
        </button>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(cards.filter((c) => c.tags.includes(t)).map((c) => c.id))}
            className="min-h-8 rounded-full border border-slate-300 bg-white px-2.5 text-slate-700"
          >
            {t}
          </button>
        ))}
        <button type="button" onClick={() => onChange([])} className="min-h-8 rounded-full px-2.5 text-indigo-700">
          選択を解除
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cards.map((c) => {
          const on = selected.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className={`flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm ${
                on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              <span aria-hidden>{ANIMAL_TEXT[c.derived.animal].emoji}</span>
              {c.name}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">{selected.length}人を選択中</p>
    </div>
  )
}
