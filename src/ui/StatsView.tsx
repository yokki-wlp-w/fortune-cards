import { useLiveQuery } from 'dexie-react-hooks'
import { SYSTEM_IDS, SYSTEM_LABEL, type SystemId } from '../content'
import { db } from '../db/db'
import { Notice, Panel, formatDateTime } from './common'
import { navigate } from './hooks'

interface Tally {
  hit: number
  miss: number
  unknown: number
}
const empty = (): Tally => ({ hit: 0, miss: 0, unknown: 0 })
const rate = (t: Tally): number | null => (t.hit + t.miss === 0 ? null : Math.round((t.hit / (t.hit + t.miss)) * 100))

/** フィードバックの集計：占術別の的中率 */
export function StatsView() {
  const data = useLiveQuery(async () => {
    const feedback = (await db.feedback.toArray()).filter((f) => !f.deletedAt)
    const cards = new Map((await db.cards.toArray()).filter((c) => !c.deletedAt).map((c) => [c.id, c.name]))
    return { feedback, cards }
  })
  if (!data) return <p className="py-10 text-center text-slate-500">読み込み中…</p>

  const bySystem = Object.fromEntries(SYSTEM_IDS.map((s) => [s, { card: empty(), pair: empty() }])) as Record<
    SystemId,
    { card: Tally; pair: Tally }
  >
  for (const f of data.feedback) bySystem[f.system][f.kind][f.verdict]++
  const total = (s: SystemId): Tally => ({
    hit: bySystem[s].card.hit + bySystem[s].pair.hit,
    miss: bySystem[s].card.miss + bySystem[s].pair.miss,
    unknown: bySystem[s].card.unknown + bySystem[s].pair.unknown,
  })
  const notes = data.feedback.filter((f) => f.note).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)
  const targetName = (targetId: string) =>
    targetId
      .split('|')
      .map((id) => data.cards.get(id) ?? '（削除済み）')
      .join(' × ')

  return (
    <div className="space-y-4">
      <Panel title="占術別の的中率">
        {data.feedback.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate-600">
            まだ記録がありません。カードの詳細や相性の画面で、項目ごとに「当たり／外れ／不明」を記録すると、ここに集計されます。
          </p>
        ) : (
          <div className="space-y-4">
            {SYSTEM_IDS.map((s) => {
              const t = total(s)
              const r = rate(t)
              return (
                <div key={s}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{SYSTEM_LABEL[s]}</span>
                    <span className="text-2xl font-black tabular-nums text-indigo-700">{r === null ? '—' : `${r}%`}</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                    {r !== null && <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r}%` }} />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-600">
                    <span>当たり {t.hit}</span>
                    <span>外れ {t.miss}</span>
                    <span>不明 {t.unknown}</span>
                    <span className="text-slate-400">
                      （個人 {rate(bySystem[s].card) ?? '—'}
                      {rate(bySystem[s].card) !== null && '%'}／相性 {rate(bySystem[s].pair) ?? '—'}
                      {rate(bySystem[s].pair) !== null && '%'}）
                    </span>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-slate-500">的中率 ＝ 当たり ÷（当たり＋外れ）。「不明」は計算から除いています。</p>
          </div>
        )}
      </Panel>

      {notes.length > 0 && (
        <Panel title="最近の観察メモ">
          <ul className="space-y-2">
            {notes.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    const ids = f.targetId.split('|')
                    navigate(f.kind === 'card' ? `/card/${ids[0]}` : `/compat?a=${ids[0]}&b=${ids[1]}`)
                  }}
                  className="w-full rounded-xl bg-slate-50 p-3 text-left text-sm hover:bg-slate-100"
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{targetName(f.targetId)}</span>
                    <span>{SYSTEM_LABEL[f.system]}</span>
                    <span>{f.verdict === 'hit' ? '当たり' : f.verdict === 'miss' ? '外れ' : '不明'}</span>
                    <span>{formatDateTime(f.updatedAt)}</span>
                  </div>
                  <p className="mt-1 text-slate-800">{f.note}</p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Notice>記録の件数が少ないうちは、的中率は偶然に左右されます。目安としてご覧ください。</Notice>
    </div>
  )
}
