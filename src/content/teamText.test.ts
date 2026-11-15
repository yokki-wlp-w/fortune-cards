import { describe, expect, it } from 'vitest'
import { computeChart, computeTeam } from '../engine'
import { teamSuggestions } from './teamText'

const team = (dates: string[]) => computeTeam(dates.map((d) => computeChart(d)))

describe('配置の提案', () => {
  it('2人のときは、つなぎ役や間に入る人には触れない', () => {
    const lines = teamSuggestions(team(['1985-04-12', '1990-11-03']), ['A', 'B'])
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines[0]).toContain('Aさん')
    expect(lines[0]).toContain('Bさん')
    expect(lines.join('')).not.toContain('間に入る')
    expect(lines.join('')).not.toContain('つなぐ位置')
    expect(lines.join('')).not.toContain('undefined')
  })
  it('3人以上のときは、つなぎ役と最も噛み合う2人を挙げる', () => {
    const lines = teamSuggestions(team(['1985-04-12', '1990-11-03', '1978-09-29', '2001-03-04']), ['A', 'B', 'C', 'D'])
    expect(lines[0]).toContain('つなぐ位置')
    expect(lines[1]).toContain('最も高い組み合わせ')
    expect(lines.join('')).not.toContain('undefined')
  })
})
