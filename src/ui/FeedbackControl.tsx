import { useEffect, useState } from 'react'
import type { SystemId } from '../content'
import { setFeedback, type FeedbackRecord, type Verdict } from '../db/db'

const OPTIONS: { value: Verdict; label: string; on: string }[] = [
  { value: 'hit', label: '当たり', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'miss', label: '外れ', on: 'bg-rose-600 text-white border-rose-600' },
  { value: 'unknown', label: '不明', on: 'bg-slate-600 text-white border-slate-600' },
]

/** 分析項目ごとの「当たり／外れ／不明」と観察メモ */
export function FeedbackControl({
  kind,
  targetId,
  itemKey,
  system,
  record,
}: {
  kind: 'card' | 'pair'
  targetId: string
  itemKey: string
  system: SystemId
  record?: FeedbackRecord
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(record?.note ?? '')
  useEffect(() => setNote(record?.note ?? ''), [record?.note])

  const target = { kind, targetId, itemKey, system }
  const choose = (v: Verdict) => void setFeedback(target, record?.verdict === v ? null : v, note)
  const saveNote = () => {
    if ((record?.note ?? '') === note.trim()) return
    // メモだけ書いた場合は「不明」として記録する
    void setFeedback(target, record?.verdict ?? 'unknown', note)
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={record?.verdict === o.value}
            onClick={() => choose(o.value)}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${
              record?.verdict === o.value ? o.on : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-h-9 rounded-full px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          {record?.note ? 'メモあり' : 'メモ'}
          {open ? ' ▲' : ' ▼'}
        </button>
      </div>
      {open && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
          maxLength={2000}
          placeholder="観察メモ（入力欄の外をタップすると保存されます）"
          className="mt-2 w-full rounded-xl border border-slate-300 p-2"
        />
      )}
      {!open && record?.note && <p className="mt-1 text-xs text-slate-500">📝 {record.note}</p>}
    </div>
  )
}
