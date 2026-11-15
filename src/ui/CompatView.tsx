import { useMemo } from 'react'
import { SYSTEM_WEIGHTS, computeCompat } from '../engine'
import { ANIMAL_TEXT, SYSTEM_LABEL, animalPairNote, describeFactor, kuubouNote, scoreLabel, type CompatLine } from '../content'
import { pairId, type CardRecord, type FeedbackRecord } from '../db/db'
import { CardFace } from './CardFace'
import { RecordCaseButton } from './CaseList'
import { ViewLogList, useRecordView } from './ViewLogList'
import { FeedbackControl } from './FeedbackControl'
import { Button, Notice, Panel, SystemChip } from './common'
import { navigate, useCards, useFeedbackMap } from './hooks'

function Score({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#059669' : value >= 65 ? '#4f46e5' : value >= 50 ? '#d97706' : '#e11d48'
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="text-4xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="mx-auto mt-1 h-2 w-full max-w-40 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="mt-1 text-xs text-slate-600">{scoreLabel(value)}</div>
    </div>
  )
}

function Lines({ lines, targetId, feedback }: { lines: CompatLine[]; targetId: string; feedback: Map<string, FeedbackRecord> }) {
  if (lines.length === 0) return <p className="text-sm text-slate-500">この組み合わせでは、特に目立つ要素は見つかりませんでした。</p>
  return (
    <div className="space-y-3">
      {lines.map((l) => (
        <div key={l.key} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <SystemChip system={l.system} />
            <span className="text-sm font-bold text-slate-900">{l.title}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-800">{l.text}</p>
          <FeedbackControl kind="pair" targetId={targetId} itemKey={l.key} system={l.system} record={feedback.get(l.key)} />
        </div>
      ))}
    </div>
  )
}

function Picker({ label, value, cards, onChange }: { label: string; value: string; cards: CardRecord[]; onChange: (id: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5"
      >
        <option value="">選んでください</option>
        {cards.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}（{c.derived.animal}）
          </option>
        ))}
      </select>
    </label>
  )
}

/** 二者相性：カードを2枚選んで表示する */
export function CompatView({ a, b }: { a: string; b: string }) {
  const cards = useCards()
  const cardA = cards?.find((c) => c.id === a)
  const cardB = cards?.find((c) => c.id === b)
  const targetId = cardA && cardB ? pairId(cardA.id, cardB.id) : undefined
  const feedback = useFeedbackMap(targetId)

  const result = useMemo(() => {
    if (!cardA || !cardB || cardA.id === cardB.id) return null
    const r = computeCompat(cardA.derived, cardB.derived)
    const lines = r.factors.map((f) => describeFactor(f, [cardA.name, cardB.name]))
    return { r, lines }
  }, [cardA, cardB])

  // 結果が表示されたら、計測ログに自動で記録する
  useRecordView('pair', [cardA?.id ?? '', cardB?.id ?? ''], !!result)

  if (!cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>
  const set = (na: string, nb: string) => navigate(`/compat?a=${na}&b=${nb}`)

  if (cards.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-bold">相性を見るには、カードが2枚以上必要です</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>
          カードを追加する
        </Button>
      </div>
    )
  }

  const good = result?.lines.filter((l) => l.tone === 'good') ?? []
  const caution = result?.lines.filter((l) => l.tone === 'caution') ?? []

  return (
    <div className="space-y-4">
      <Panel title="二者相性">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Picker label="1人目" value={a} cards={cards} onChange={(id) => set(id, b)} />
          <button
            type="button"
            onClick={() => set(b, a)}
            aria-label="1人目と2人目を入れ替える"
            className="mb-0.5 min-h-11 rounded-xl px-2 text-lg text-indigo-700 hover:bg-indigo-50"
          >
            ⇄
          </button>
          <Picker label="2人目" value={b} cards={cards} onChange={(id) => set(a, id)} />
        </div>
        {cardA && cardB && cardA.id === cardB.id && <p className="mt-3 text-sm text-rose-700">別々のカードを選んでください</p>}
      </Panel>

      {cardA && cardB && result && targetId && (
        <>
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
            <CardFace card={cardA} onClick={() => navigate(`/card/${cardA.id}`)} />
            <CardFace card={cardB} onClick={() => navigate(`/card/${cardB.id}`)} />
          </div>

          <Panel title="相性スコア">
            <div className="grid grid-cols-2 gap-3">
              <Score label="仕事" value={result.r.work} />
              <Score label="プライベート" value={result.r.private} />
            </div>
            <table className="mt-3 w-full text-center text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="p-1 text-left font-semibold">内訳</th>
                  <th className="p-1 font-semibold">仕事</th>
                  <th className="p-1 font-semibold">プライベート</th>
                  <th className="p-1 font-semibold">重み</th>
                </tr>
              </thead>
              <tbody>
                {(['shichu', 'kyusei'] as const).map((s) => (
                  <tr key={s} className="border-t border-slate-100">
                    <th className="p-1 text-left font-semibold text-slate-700">{SYSTEM_LABEL[s]}</th>
                    <td className="p-1 tabular-nums">{result.r.bySystem[s].work}</td>
                    <td className="p-1 tabular-nums">{result.r.bySystem[s].private}</td>
                    <td className="p-1 tabular-nums text-slate-500">{Math.round(SYSTEM_WEIGHTS[s] * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">
              60点を基準に、噛み合う要素で加点、ぶつかりやすい要素で減点しています。動物タイプと数秘術はスコアに含めていません。
            </p>
            {(cardA.derived.boundary || cardB.derived.boundary) && (
              <p className="mt-2 text-xs text-amber-800">
                境界日生まれのカードが含まれます。節入り後の候補で計算しているため、結果が変わる可能性があります。
              </p>
            )}
          </Panel>

          <RecordCaseButton kind="pair" members={[cardA, cardB]} className="w-full" />

          <Panel title="噛み合う点">
            <Lines lines={good} targetId={targetId} feedback={feedback} />
          </Panel>
          <Panel title="揉めやすい点">
            <Lines lines={caution} targetId={targetId} feedback={feedback} />
          </Panel>
          <Panel title="関わる際の注意点">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-800">
              {[...caution, ...good].map((l) => (
                <li key={l.key}>{l.advice}</li>
              ))}
              {result.r.kuubouHits.map((owner) => (
                <li key={`kuubou-${owner}`}>
                  {owner === 0 ? kuubouNote(cardA.name, cardB.name) : kuubouNote(cardB.name, cardA.name)}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="動物タイプの組み合わせ（参考・スコア対象外）">
            <p className="text-2xl" aria-hidden>
              {ANIMAL_TEXT[cardA.derived.animal].emoji} × {ANIMAL_TEXT[cardB.derived.animal].emoji}
            </p>
            <p className="mt-1 text-sm font-bold">
              {cardA.derived.animal} × {cardB.derived.animal}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{animalPairNote(cardA.derived.animal, cardB.derived.animal)}</p>
            <FeedbackControl kind="pair" targetId={targetId} itemKey="animal.pair" system="animal" record={feedback.get('animal.pair')} />
          </Panel>
          <Notice>相性は「良い・悪い」を決めるものではなく、関わり方を考えるための手がかりです。</Notice>
        </>
      )}

      <ViewLogList kind="pair" cards={cards} />
    </div>
  )
}
