import { describe, expect, it } from 'vitest'
import writeExcelFile from 'write-excel-file/node'
import { ENGINE_VERSION, computeChart } from '../engine'
import { buildCaseSnapshot } from '../content'
import type { CardRecord, CaseRecord } from '../db/db'
import { buildSheets } from './excel'

const card = (id: string, name: string, birthDate: string, tags: string[] = []): CardRecord => ({
  id,
  name,
  birthDate,
  tags,
  engineVersion: ENGINE_VERSION,
  derived: computeChart(birthDate),
  createdAt: 1,
  updatedAt: 1,
})

describe('Excel 出力', () => {
  const cards = [card('a', 'たろう', '1990-05-15', ['仕事']), card('b', 'はなこ', '1988-12-01'), card('c', 'じろう', '2021-02-03')]
  const cases: CaseRecord[] = [
    {
      id: 'k1', title: '立ち上げ', date: '2026-11-15', kind: 'team', memberIds: ['a', 'b', 'gone'],
      scene: '新規案件', reading: '見立て', outcome: '結果', learning: '学び', usefulness: 'partial', tags: ['配置'],
      snapshot: buildCaseSnapshot('team', cards.slice(0, 2).map((c) => ({ name: c.name, chart: c.derived }))),
      createdAt: 1, updatedAt: 1,
    },
  ]
  const sheets = buildSheets(cards, cases)

  it('カード一覧・相性一覧・ケース一覧・注意書きの4シート', () => {
    expect(sheets.map((s) => s.sheet)).toEqual(['カード一覧', '相性一覧', 'ケース一覧', '注意書き'])
    expect(sheets[0].data).toHaveLength(1 + 3)
    expect(sheets[1].data).toHaveLength(1 + 3) // 3人なら3組
    expect(sheets[2].data).toHaveLength(1 + 1)
    // 列数は見出しとそろっている
    for (const s of sheets.slice(0, 3)) for (const row of s.data) expect(row).toHaveLength(s.columns.length)
  })
  it('ケースには名前・役立ち度・記録時点の分析結果が入る', () => {
    const row = sheets[2].data[1].map((c) => c?.value)
    expect(row[1]).toBe('立ち上げ')
    expect(row[3]).toBe('たろう、はなこ、（削除済み）')
    expect(row[8]).toBe('一部役立った')
    expect(String(row[10])).toContain('チーム平均')
    expect(String(row[10])).toContain('計算エンジン')
  })
  it('名前・干支・境界日が入る', () => {
    const row = sheets[0].data[3].map((c) => c?.value)
    expect(row[0]).toBe('じろう')
    expect(row.slice(3, 6)).toEqual(['辛丑', '庚寅', '壬午'])
    expect(String(row[row.length - 2])).toContain('立春')
  })
  it('実際に .xlsx として書き出せる', async () => {
    const buffer = await writeExcelFile(sheets).toBuffer()
    expect(buffer.length).toBeGreaterThan(1000)
    expect(buffer.subarray(0, 2).toString()).toBe('PK') // xlsx は zip 形式
  })
})
