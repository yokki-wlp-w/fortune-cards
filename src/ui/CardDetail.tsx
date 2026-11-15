import { useMemo, useState } from 'react'
import { ENGINE_VERSION, KYUSEI_NAMES, type ChartCore } from '../engine'
import {
  HEADING_ELEMENTS,
  HEADING_FACES,
  JUNIUN_NOTE,
  LIFE_PATH_TEXT,
  NOTICE_ANIMAL,
  NOTICE_BOUNDARY,
  buildProfile,
  type ProfileItem,
} from '../content'
import { FacesDiagram } from './FacesDiagram'
import { deleteCard, type CardRecord, type FeedbackRecord } from '../db/db'
import { CardFace } from './CardFace'
import { CardForm } from './CardForm'
import { RecordCaseButton } from './CaseList'
import { ElementChart } from './ElementChart'
import { FeedbackControl } from './FeedbackControl'
import { Button, Notice, Panel, SystemChip, formatDate } from './common'
import { navigate, useCards, useFeedbackMap } from './hooks'

function Item({ item, cardId, record }: { item: ProfileItem; cardId: string; record?: FeedbackRecord }) {
  return (
    <div className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <SystemChip system={item.system} />
        <span className="text-xs text-slate-500">{item.source}</span>
      </div>
      {item.text && <p className="text-sm leading-relaxed text-slate-800">{item.text}</p>}
      {item.list && (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-800">
          {item.list.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {item.cautions && (
        <ul className="space-y-2">
          {item.cautions.map((c) => (
            <li key={c.point} className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed">
              <p className="text-slate-800">
                <span className="mr-1 font-bold text-amber-700">注意点</span>
                {c.point}
              </p>
              <p className="mt-1 text-slate-800">
                <span className="mr-1 font-bold text-emerald-700">活かし方</span>
                {c.use}
              </p>
            </li>
          ))}
        </ul>
      )}
      <FeedbackControl kind="card" targetId={cardId} itemKey={item.key} system={item.system} record={record} />
    </div>
  )
}

function ResultTable({ chart, lifePath }: { chart: ChartCore; lifePath: number }) {
  const p = chart.pillars
  const cols = [
    { head: '年柱', pillar: p.year, zokan: chart.zokan.year, stemStar: chart.tsuhensei.yearStem, branchStar: chart.tsuhensei.yearBranch, juniun: chart.juniun.year },
    { head: '月柱', pillar: p.month, zokan: chart.zokan.month, stemStar: chart.tsuhensei.monthStem, branchStar: chart.tsuhensei.monthBranch, juniun: chart.juniun.month },
    { head: '日柱', pillar: p.day, zokan: chart.zokan.day, stemStar: '（日干）', branchStar: chart.tsuhensei.dayBranch, juniun: chart.juniun.day },
  ]
  const rows: [string, (c: (typeof cols)[number]) => string][] = [
    ['干支', (c) => c.pillar.label],
    ['通変星（天干）', (c) => c.stemStar],
    ['蔵干', (c) => c.zokan.join('・')],
    ['通変星（蔵干の本気）', (c) => c.branchStar],
    ['十二運', (c) => c.juniun],
  ]
  return (
    <div className="space-y-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="p-1.5 text-left font-semibold">四柱推命</th>
              {cols.map((c) => (
                <th key={c.head} className="p-1.5 font-semibold">
                  {c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, get], i) => (
              <tr key={label} className="border-t border-slate-100">
                <th className="p-1.5 text-left text-xs font-semibold text-slate-500">{label}</th>
                {cols.map((c) => (
                  <td key={c.head} className={`p-1.5 ${i === 0 ? 'text-lg font-bold' : ''}`}>
                    {get(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-xs font-semibold text-slate-500">空亡（天中殺）</dt>
        <dd>{chart.kuubou.join('・')}</dd>
        <dt className="text-xs font-semibold text-slate-500">日柱の十二運</dt>
        <dd>
          {chart.juniun.day}：{JUNIUN_NOTE[chart.juniun.day]}
        </dd>
        <dt className="text-xs font-semibold text-slate-500">九星気学</dt>
        <dd>
          本命星 {KYUSEI_NAMES[chart.kyusei.honmei]}／月命星 {KYUSEI_NAMES[chart.kyusei.getsumei]}
        </dd>
        <dt className="text-xs font-semibold text-slate-500">動物タイプ</dt>
        <dd>{chart.animal}</dd>
        <dt className="text-xs font-semibold text-slate-500">数秘術</dt>
        <dd>
          ライフパスナンバー {lifePath}（{LIFE_PATH_TEXT[lifePath].keyword}）
        </dd>
      </dl>
      <p className="text-xs text-slate-400">
        時柱と大運は、出生時刻・性別を使わないため算出していません。通変星は蔵干の本気で引いています。計算エンジン v{ENGINE_VERSION}
      </p>
    </div>
  )
}

export function CardDetail({ id }: { id: string }) {
  const cards = useCards()
  const feedback = useFeedbackMap(id)
  const [editing, setEditing] = useState(false)
  const [useAlt, setUseAlt] = useState(false)

  const card: CardRecord | undefined = cards?.find((c) => c.id === id)
  const boundary = card?.derived.boundary
  const chart: ChartCore | undefined = card ? (useAlt && boundary ? boundary.alt : card.derived) : undefined
  const sections = useMemo(
    () => (card && chart ? buildProfile({ ...chart, lifePath: card.derived.lifePath }) : []),
    [card, chart],
  )
  const allTags = useMemo(() => [...new Set((cards ?? []).flatMap((c) => c.tags))], [cards])

  if (!cards) return <p className="py-10 text-center text-slate-500">読み込み中…</p>
  if (!card || !chart) {
    return (
      <div className="py-10 text-center">
        <p className="text-slate-600">カードが見つかりません</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          一覧へ戻る
        </Button>
      </div>
    )
  }

  const remove = async () => {
    if (!window.confirm(`「${card.name}」のカードを削除します。記録したフィードバックも削除されます。よろしいですか？`)) return
    await deleteCard(card.id)
    navigate('/')
  }
  // 候補を切り替えたときは、その命式でカードの顔も描き直す
  const faceCard: CardRecord = { ...card, derived: { ...card.derived, ...chart } }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate('/')} className="min-h-9 text-sm font-semibold text-indigo-700">
        ← 一覧へ
      </button>

      <div className="grid gap-4 md:grid-cols-[260px_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[260px] space-y-3">
          <CardFace card={faceCard} size="lg" />
          <p className="text-center text-sm text-slate-600">{formatDate(card.birthDate)} 生まれ</p>
          {card.memo && <p className="rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">{card.memo}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" className="col-span-2" onClick={() => navigate(`/compat?a=${card.id}`)}>
              相性を見る
            </Button>
            <Button className="col-span-2" onClick={() => navigate(`/yearly?ids=${card.id}`)}>
              年運を見る
            </Button>
            <RecordCaseButton kind="person" members={[card]} className="col-span-2" />
            <Button onClick={() => setEditing(true)}>編集</Button>
            <Button variant="danger" onClick={remove}>
              削除
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {boundary && (
            <Panel title={`境界日（${boundary.termName}の当日・節入りは ${boundary.timeJst} ごろ）`}>
              <p className="text-sm leading-relaxed text-slate-700">{NOTICE_BOUNDARY}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { alt: false, label: `${boundary.timeJst} 以降の生まれ`, c: card.derived as ChartCore },
                  { alt: true, label: `${boundary.timeJst} より前の生まれ`, c: boundary.alt },
                ].map((o) => (
                  <button
                    key={String(o.alt)}
                    type="button"
                    aria-pressed={useAlt === o.alt}
                    onClick={() => setUseAlt(o.alt)}
                    className={`rounded-xl border p-2.5 text-left text-sm ${
                      useAlt === o.alt ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-600">{o.label}</div>
                    <div className="mt-1 font-bold">
                      {boundary.kind === 'risshun' && `年柱 ${o.c.pillars.year.label}・`}月柱 {o.c.pillars.month.label}
                    </div>
                    <div className="text-xs text-slate-600">
                      {boundary.kind === 'risshun' && `${KYUSEI_NAMES[o.c.kyusei.honmei]}／`}月命星 {KYUSEI_NAMES[o.c.kyusei.getsumei]}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                タップすると、その候補での分析に切り替わります。一覧と相性では「{boundary.timeJst} 以降」の候補を使います。
              </p>
            </Panel>
          )}

          {sections.map((s) => (
            <Panel key={s.heading} title={s.heading}>
              <div className="space-y-3">
                {s.heading === HEADING_FACES && <FacesDiagram chart={chart} />}
                {s.heading === HEADING_ELEMENTS && <ElementChart elements={chart.elements} />}
                {s.items.map((item) => (
                  <Item key={item.key} item={item} cardId={card.id} record={feedback.get(item.key)} />
                ))}
              </div>
            </Panel>
          ))}

          <Panel title="各占術の算出結果">
            <ResultTable chart={chart} lifePath={card.derived.lifePath} />
          </Panel>
          <Notice>{NOTICE_ANIMAL}</Notice>
        </div>
      </div>

      {editing && <CardForm card={card} knownTags={allTags} onClose={() => setEditing(false)} />}
    </div>
  )
}
