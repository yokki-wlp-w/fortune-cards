import { useEffect, useRef, useState } from 'react'
import type { SystemId } from '../content'
import { setFeedback, type FeedbackRecord, type Verdict } from '../db/db'

const OPTIONS: { value: Verdict; label: string; on: string }[] = [
  { value: 'hit', label: '当たり', on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'miss', label: '外れ', on: 'bg-rose-600 text-white border-rose-600' },
  { value: 'unknown', label: '不明', on: 'bg-slate-600 text-white border-slate-600' },
]
/** 入力が止まってから自動保存するまでの時間 */
const AUTOSAVE_MS = 1000

/** 分析項目ごとの「当たり／外れ／不明」と観察メモ。メモは自動保存し、状態を表示する */
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
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // 保存処理から常に最新の値を参照できるようにする
  const latest = useRef({ note, verdict: record?.verdict, saved: record?.note ?? '' })
  latest.current = { note, verdict: record?.verdict, saved: record?.note ?? '' }

  const target = { kind, targetId, itemKey, system }

  const saveNote = async () => {
    clearTimeout(timer.current)
    const cur = latest.current
    if (cur.saved === cur.note.trim()) {
      setStatus((s) => (s === 'dirty' ? 'idle' : s))
      return
    }
    // メモだけ書いた場合は「不明」として記録する
    await setFeedback(target, cur.verdict ?? 'unknown', cur.note)
    setStatus('saved')
  }

  // 他の端末との同期などで保存済みのメモが変わったら、入力中でなければ反映する
  useEffect(() => {
    if (status !== 'dirty') setNote(record?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.note])

  // 画面を離れるときに、未保存の入力があれば保存する
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      const cur = latest.current
      if (cur.saved !== cur.note.trim()) void setFeedback(target, cur.verdict ?? 'unknown', cur.note)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const onChange = (value: string) => {
    setNote(value)
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void saveNote(), AUTOSAVE_MS)
  }
  const choose = (v: Verdict) => {
    clearTimeout(timer.current)
    void setFeedback(target, record?.verdict === v ? null : v, note).then(() => setStatus((s) => (s === 'dirty' ? 'saved' : s)))
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
        <div className="mt-2">
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => void saveNote()}
            rows={2}
            maxLength={2000}
            placeholder="観察メモ（入力すると自動で保存されます）"
            aria-label="観察メモ"
            className="w-full rounded-xl border border-slate-300 p-2"
          />
          <div className="mt-1 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={status !== 'dirty'}
              className="min-h-8 rounded-full border border-indigo-600 px-3 font-semibold text-indigo-700 disabled:border-slate-300 disabled:text-slate-400"
            >
              保存
            </button>
            <span role="status" className={status === 'dirty' ? 'text-amber-700' : 'text-emerald-700'}>
              {status === 'dirty' ? '未保存（まもなく自動保存します）' : status === 'saved' ? '✓ 保存しました' : record?.note ? '✓ 保存済み' : ''}
            </span>
          </div>
        </div>
      )}
      {!open && record?.note && <p className="mt-1 text-xs text-slate-500">📝 {record.note}</p>}
    </div>
  )
}
