// カード一覧と相性結果を .xlsx に出力する。ファイルは端末内で作り、外部には送らない。
import { ELEMENTS, KYUSEI_NAMES, animalFaces, computeCompat } from '../engine'
import { NOTICE_ANIMAL, NOTICE_CONSENT, NOTICE_REFERENCE, describeFactor } from '../content'
import type { CardRecord } from '../db/db'

type Cell = { value: string | number; fontWeight?: 'bold' } | null
export interface SheetSpec {
  sheet: string
  data: Cell[][]
  columns: { width: number }[]
  stickyRowsCount?: number
}

const header = (labels: string[]): Cell[] => labels.map((value) => ({ value, fontWeight: 'bold' as const }))
const text = (value: string): Cell => (value === '' ? null : { value })
const num = (value: number): Cell => ({ value })

/** 出力する3つのシート（カード一覧・相性一覧・注意書き）の中身を作る */
export function buildSheets(cards: CardRecord[]): SheetSpec[] {
  const cardHead = [
    '名前', '生年月日', 'タグ', '年柱', '月柱', '日柱', '日干',
    ...ELEMENTS.map((e) => `五行:${e}`),
    '本命星', '月命星', '動物(本質)', '動物(表面)', '動物(意思決定)',
    '月柱の通変星', '日柱の十二運', '空亡', 'ライフパス', '境界日', 'メモ',
  ]
  const cardRows = cards.map((c): Cell[] => {
    const d = c.derived
    const faces = animalFaces(d)
    return [
      text(c.name), text(c.birthDate), text(c.tags.join('、')),
      text(d.pillars.year.label), text(d.pillars.month.label), text(d.pillars.day.label), text(d.dayStem),
      ...ELEMENTS.map((e) => num(d.elements[e])),
      text(KYUSEI_NAMES[d.kyusei.honmei]), text(KYUSEI_NAMES[d.kyusei.getsumei]),
      text(faces.honshitsu), text(faces.hyomen), text(faces.ishikettei),
      text(d.tsuhensei.monthBranch), text(d.juniun.day), text(d.kuubou.join('・')), num(d.lifePath),
      text(d.boundary ? `${d.boundary.termName}の当日（節入り ${d.boundary.timeJst}ごろ）` : ''),
      text(c.memo ?? ''),
    ]
  })

  const pairHead = ['1人目', '2人目', '仕事', 'プライベート', '四柱推命(仕事)', '四柱推命(プライベート)', '九星気学(仕事)', '九星気学(プライベート)', '噛み合う点', '揉めやすい点']
  const pairRows: Cell[][] = []
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]
      const b = cards[j]
      const r = computeCompat(a.derived, b.derived)
      const lines = r.factors.map((f) => describeFactor(f, [a.name, b.name]))
      const titles = (tone: 'good' | 'caution') => lines.filter((l) => l.tone === tone).map((l) => l.title).join(' ／ ')
      pairRows.push([
        text(a.name), text(b.name), num(r.work), num(r.private),
        num(r.bySystem.shichu.work), num(r.bySystem.shichu.private), num(r.bySystem.kyusei.work), num(r.bySystem.kyusei.private),
        text(titles('good')), text(titles('caution')),
      ])
    }
  }

  const notes = [NOTICE_REFERENCE, NOTICE_CONSENT, NOTICE_ANIMAL, '境界日のカードは、節入り後の候補で算出しています。', `出力日時：${new Date().toLocaleString('ja-JP')}`]

  return [
    {
      sheet: 'カード一覧',
      data: [header(cardHead), ...cardRows],
      columns: cardHead.map((h) => ({ width: h === 'メモ' || h === '境界日' ? 30 : h.startsWith('五行') ? 8 : 14 })),
      stickyRowsCount: 1,
    },
    {
      sheet: '相性一覧',
      data: [header(pairHead), ...pairRows],
      columns: pairHead.map((h) => ({ width: h.includes('点') ? 50 : 14 })),
      stickyRowsCount: 1,
    },
    { sheet: '注意書き', data: notes.map((n) => [text(n)]), columns: [{ width: 100 }] },
  ]
}

/** .xlsx ファイルを作る（ライブラリは必要になったときだけ読み込む） */
export async function buildExcelFile(cards: CardRecord[], fileName: string): Promise<File> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const blob = await writeExcelFile(buildSheets(cards)).toBlob()
  return new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
