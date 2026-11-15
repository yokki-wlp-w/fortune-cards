import { describe, expect, it } from 'vitest'
import writeExcelFile from 'write-excel-file/node'
import { ENGINE_VERSION, computeChart } from '../engine'
import type { CardRecord } from '../db/db'
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
  const sheets = buildSheets(cards)

  it('カード一覧・相性一覧・注意書きの3シート', () => {
    expect(sheets.map((s) => s.sheet)).toEqual(['カード一覧', '相性一覧', '注意書き'])
    expect(sheets[0].data).toHaveLength(1 + 3)
    expect(sheets[1].data).toHaveLength(1 + 3) // 3人なら3組
    // 列数は見出しとそろっている
    for (const s of sheets.slice(0, 2)) for (const row of s.data) expect(row).toHaveLength(s.columns.length)
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
