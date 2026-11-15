import { useState, type FormEvent } from 'react'
import { CASE_KIND_LABEL, USEFULNESS_KEYS, USEFULNESS_LABEL } from '../content'
import { deleteCase, saveCase, type CardRecord, type CaseKind, type CaseRecord, type Usefulness } from '../db/db'
import { Button } from './common'

const DEFAULT_TAGS = ['配置', '1on1', 'チームづくり', '家族', '友人']
const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface CaseDraft {
  kind: CaseKind
  memberIds: string[]
  snapshot: string[]
}

function Area({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={5000}
        placeholder={hint}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
      />
    </label>
  )
}

/** ケーススタディの記録・編集。新規のときは draft（対象と分析結果の控え）を渡す */
export function CaseForm({
  record,
  draft,
  cards,
  knownTags,
  onClose,
}: {
  record?: CaseRecord
  draft?: CaseDraft
  cards: CardRecord[]
  knownTags: string[]
  onClose: () => void
}) {
  const base = record ?? draft!
  const [title, setTitle] = useState(record?.title ?? '')
  const [date, setDate] = useState(record?.date ?? today())
  const [scene, setScene] = useState(record?.scene ?? '')
  const [reading, setReading] = useState(record?.reading ?? '')
  const [outcome, setOutcome] = useState(record?.outcome ?? '')
  const [learning, setLearning] = useState(record?.learning ?? '')
  const [usefulness, setUsefulness] = useState<Usefulness | undefined>(record?.usefulness)
  const [tags, setTags] = useState<string[]>(record?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const names = base.memberIds.map((id) => cards.find((c) => c.id === id)?.name ?? '（削除済み）')
  const suggestions = [...new Set([...DEFAULT_TAGS, ...knownTags, ...tags])]
  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!date) return setError('日付を入力してください')
    setBusy(true)
    try {
      const pending = tagInput.trim()
      await saveCase({
        id: record?.id,
        title,
        date,
        kind: base.kind,
        memberIds: base.memberIds,
        scene,
        reading,
        outcome,
        learning,
        usefulness,
        tags: pending ? [...tags, pending] : tags,
        snapshot: base.snapshot,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした')
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!record || !window.confirm(`ケース「${record.title}」を削除します。よろしいですか？`)) return
    await deleteCase(record.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">{record ? 'ケースを編集' : 'ケースとして記録'}</h2>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-900">
            <span className="mr-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">{CASE_KIND_LABEL[base.kind]}</span>
            {names.join('・')}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">記録時点の分析結果（自動で控えたもの）</summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-relaxed text-slate-600">
              {base.snapshot.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">タイトル</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="例：新規プロジェクトの立ち上げ"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">日付</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
        </label>

        <Area label="場面" hint="どんな状況だったか" value={scene} onChange={setScene} />
        <Area label="分析から読み取ったこと" hint="事前の見立て。どう関わろうと考えたか" value={reading} onChange={setReading} />
        <Area label="実際に起きたこと" hint="あとから追記できます" value={outcome} onChange={setOutcome} />
        <Area label="学び・次に活かすこと" hint="あとから追記できます" value={learning} onChange={setLearning} />

        <div>
          <span className="text-sm font-semibold text-slate-700">分析は役立ちましたか（あとから選べます）</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {USEFULNESS_KEYS.map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={usefulness === u}
                onClick={() => setUsefulness(usefulness === u ? undefined : u)}
                className={`min-h-9 rounded-full border px-3 text-sm ${usefulness === u ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                {USEFULNESS_LABEL[u]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold text-slate-700">タグ（任意）</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tags.includes(t)}
                onClick={() => toggleTag(t)}
                className={`min-h-9 rounded-full border px-3 text-sm ${tags.includes(t) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
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
              aria-label="新しいタグ"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
            />
            <Button onClick={addTag}>追加</Button>
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        <div className="flex gap-2">
          {record && (
            <Button variant="danger" onClick={remove}>
              削除
            </Button>
          )}
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
