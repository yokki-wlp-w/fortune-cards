import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { computeCompat, computeTeam } from '../engine'
import { ANIMAL_TEXT } from '../content'
import { db, deleteViewLog, pairId, recordView, type CardRecord } from '../db/db'
import { Panel, formatDateTime } from './common'
import { navigate } from './hooks'

/** 結果を表示してから記録するまでの待ち時間。選び直しの途中の組み合わせを残さないため */
const RECORD_DELAY_MS = 2500

/** 分析結果が表示されたら、少し待ってから計測ログに記録する */
export function useRecordView(kind: 'pair' | 'team', memberIds: string[], enabled: boolean): void {
  const key = [...memberIds].sort().join('|')
  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => void recordView(kind, key.split('|')), RECORD_DELAY_MS)
    return () => clearTimeout(timer)
  }, [kind, key, enabled])
}

/** 計測ログ：これまでに見た組み合わせ（相性）／チーム。同じ組み合わせは1行 */
export function ViewLogList({ kind, cards }: { kind: 'pair' | 'team'; cards: CardRecord[] }) {
  const logs = useLiveQuery(
    async () => (await db.logs.where('kind').equals(kind).toArray()).filter((l) => !l.deletedAt).sort((a, b) => b.viewedAt - a.viewedAt),
    [kind],
  )
  const feedbackTargets = useLiveQuery(async () => new Set((await db.feedback.toArray()).filter((f) => !f.deletedAt).map((f) => f.targetId)))

  const rows = useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c]))
    return (logs ?? []).flatMap((log) => {
      const members = log.memberIds.map((id) => byId.get(id))
      if (members.some((m) => !m)) return [] // 削除されたカードを含むログは出さない
      const ms = members as CardRecord[]
      // 点数は保存せず、表示のたびに計算する
      const score =
        kind === 'pair'
          ? computeCompat(ms[0].derived, ms[1].derived)
          : computeTeam(ms.map((m) => m.derived)).average
      return [{ log, members: ms, work: score.work, private: score.private }]
    })
  }, [logs, cards, kind])

  if (!logs) return null
  const title = kind === 'pair' ? 'これまでに見た組み合わせ' : 'これまでに見たチーム'

  return (
    <Panel title={title} action={<span className="text-xs text-slate-500">{rows.length}件</span>}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          {kind === 'pair' ? '2人を選んで相性を表示すると' : 'メンバーを選んで分析を表示すると'}、ここに自動で記録されます。
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map(({ log, members, work, private: priv }) => {
            const open = () =>
              navigate(
                kind === 'pair'
                  ? `/compat?a=${members[0].id}&b=${members[1].id}`
                  : `/team?ids=${members.map((m) => m.id).join(',')}`,
              )
            const hasFeedback = kind === 'pair' && feedbackTargets?.has(pairId(members[0].id, members[1].id))
            const label = members.map((m) => m.name).join(kind === 'pair' ? ' × ' : '・')
            return (
              <li key={log.id} className="flex items-center gap-2 py-2">
                <button type="button" onClick={open} className="min-w-0 flex-1 rounded-lg p-1 text-left hover:bg-slate-50">
                  <div className="flex flex-wrap items-center gap-x-1 text-sm font-semibold text-slate-900">
                    <span aria-hidden>{members.slice(0, 6).map((m) => ANIMAL_TEXT[m.derived.animal].emoji).join('')}</span>
                    <span className="min-w-0 break-words">{label}</span>
                    {kind === 'team' && <span className="text-xs font-normal text-slate-500">（{members.length}人）</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-600">
                    <span>
                      {kind === 'team' && '平均 '}仕事 <strong className="tabular-nums">{work}</strong>
                    </span>
                    <span>
                      プライベート <strong className="tabular-nums">{priv}</strong>
                    </span>
                    <span>最後に見た日：{formatDateTime(log.viewedAt)}</span>
                    {hasFeedback && <span className="text-emerald-700">✓ フィードバックあり</span>}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteViewLog(log.id)}
                  aria-label={`${label}のログを削除`}
                  className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                >
                  削除
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-400">点数は表示のたびに計算しています。同じ組み合わせは1行にまとめ、最後に見た日を更新します。</p>
    </Panel>
  )
}
