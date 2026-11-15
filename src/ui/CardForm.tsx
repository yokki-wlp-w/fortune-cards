import { useState, type FormEvent } from 'react'
import { MAX_YEAR, MIN_YEAR } from '../engine'
import { NOTICE_CONSENT } from '../content'
import { saveCard, type CardRecord } from '../db/db'
import { Button, Notice } from './common'

const DEFAULT_TAGS = ['家族', '仕事', '友人']

/** カードの追加・編集（入力は名前と生年月日のみ。タグとメモは任意） */
export function CardForm({
  card,
  knownTags,
  onClose,
  onSaved,
}: {
  card?: CardRecord
  knownTags: string[]
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const [name, setName] = useState(card?.name ?? '')
  const [birthDate, setBirthDate] = useState(card?.birthDate ?? '')
  const [tags, setTags] = useState<string[]>(card?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [memo, setMemo] = useState(card?.memo ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const suggestions = [...new Set([...DEFAULT_TAGS, ...knownTags])]
  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('名前を入力してください')
    if (!birthDate) return setError('生年月日を入力してください')
    setBusy(true)
    try {
      const pending = tagInput.trim()
      const id = await saveCard({ id: card?.id, name, birthDate, tags: pending ? [...tags, pending] : tags, memo })
      onSaved?.(id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">{card ? 'カードを編集' : 'カードを追加'}</h2>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">名前（ニックネーム可）</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus={!card}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">生年月日</span>
          <input
            type="date"
            value={birthDate}
            min={`${MIN_YEAR}-01-01`}
            max={`${MAX_YEAR}-12-31`}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          />
        </label>

        <div>
          <span className="text-sm font-semibold text-slate-700">タグ（任意）</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[...new Set([...suggestions, ...tags])].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tags.includes(t)}
                onClick={() => toggleTag(t)}
                className={`min-h-9 rounded-full border px-3 text-sm ${
                  tags.includes(t) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              maxLength={20}
              placeholder="新しいタグ"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
            />
            <Button onClick={addTag}>追加</Button>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">メモ（任意）</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={1000}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        <Notice>{NOTICE_CONSENT}</Notice>
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={busy}>
            保存
          </Button>
        </div>
      </form>
    </div>
  )
}
