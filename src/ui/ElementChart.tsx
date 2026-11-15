import { ELEMENTS, type Element } from '../engine'
import { ELEMENT_TEXT } from '../content'
import { ELEMENT_STYLE } from './common'

/** 五行バランスのレーダーチャート（SVG） */
export function ElementChart({ elements }: { elements: Record<Element, number> }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2 + 4
  const radius = 70
  const max = Math.max(3, ...ELEMENTS.map((e) => elements[e]))
  const point = (i: number, r: number): [number, number] => {
    const angle = (-90 + i * 72) * (Math.PI / 180)
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }
  const ring = (ratio: number) => ELEMENTS.map((_, i) => point(i, radius * ratio).join(',')).join(' ')
  const shape = ELEMENTS.map((e, i) => point(i, radius * Math.max(0.04, elements[e] / max)).join(',')).join(' ')

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-56 max-w-full" role="img" aria-label="五行バランス">
        {[0.33, 0.66, 1].map((r) => (
          <polygon key={r} points={ring(r)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {ELEMENTS.map((_, i) => {
          const [x, y] = point(i, radius)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
        })}
        <polygon points={shape} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
        {ELEMENTS.map((e, i) => {
          const [x, y] = point(i, radius + 20)
          return (
            <text key={e} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="700" fill={ELEMENT_STYLE[e].hex}>
              {e}
            </text>
          )
        })}
      </svg>
      <ul className="w-full max-w-xs space-y-1.5 text-sm">
        {ELEMENTS.map((e) => (
          <li key={e} className="flex items-center gap-2">
            <span className="w-5 font-bold" style={{ color: ELEMENT_STYLE[e].hex }}>
              {e}
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.min(100, (elements[e] / max) * 100)}%`, background: ELEMENT_STYLE[e].hex }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-slate-700">{elements[e].toFixed(1)}</span>
            <span className="w-16 text-xs text-slate-500">{ELEMENT_TEXT[e].theme}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
