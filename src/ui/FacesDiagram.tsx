import { animalFaces, type ChartCore, type FaceRole } from '../engine'
import { ANIMAL_TEXT, FACE_ROLE_TEXT, FACE_UNAVAILABLE } from '../content'

const ROLE_STYLE: Record<FaceRole, { ring: string; chip: string }> = {
  honshitsu: { ring: 'ring-indigo-500 bg-indigo-50', chip: 'bg-indigo-600 text-white' },
  hyomen: { ring: 'ring-orange-400 bg-orange-50', chip: 'bg-orange-500 text-white' },
  ishikettei: { ring: 'ring-teal-500 bg-teal-50', chip: 'bg-teal-600 text-white' },
}

function Face({ role, animal, big }: { role: FaceRole; animal: string; big?: boolean }) {
  const t = FACE_ROLE_TEXT[role]
  const s = ROLE_STYLE[role]
  return (
    <div className="flex flex-col items-center text-center">
      <span className={`mb-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${s.chip}`}>{t.label}</span>
      <div
        className={`flex items-center justify-center rounded-full ring-4 ${s.ring} ${big ? 'h-28 w-28 text-6xl sm:h-32 sm:w-32 sm:text-7xl' : 'h-20 w-20 text-4xl sm:h-24 sm:w-24 sm:text-5xl'}`}
        aria-hidden
      >
        {ANIMAL_TEXT[animal].emoji}
      </div>
      <div className={`mt-1.5 font-bold text-slate-900 ${big ? 'text-base' : 'text-sm'}`}>{animal}</div>
      <div className="text-[11px] leading-tight text-slate-500">{t.short}</div>
    </div>
  )
}

/** 動物タイプの「3つの顔」を図で見せる。中央が本質、左右が表面と意思決定 */
export function FacesDiagram({ chart }: { chart: ChartCore }) {
  const faces = animalFaces(chart)
  const summary = `本質は${faces.honshitsu}、表面は${faces.hyomen}、意思決定は${faces.ishikettei}`
  return (
    <figure aria-label={summary}>
      <div className="relative mx-auto max-w-md">
        {/* 3つの顔をつなぐ線 */}
        <svg viewBox="0 0 300 100" className="pointer-events-none absolute inset-x-0 top-10 h-20 w-full sm:top-12" aria-hidden>
          <line x1="50" y1="50" x2="250" y2="50" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" />
        </svg>
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-end gap-1">
          <Face role="hyomen" animal={faces.hyomen} />
          <Face role="honshitsu" animal={faces.honshitsu} big />
          <Face role="ishikettei" animal={faces.ishikettei} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] leading-tight text-slate-500">
        <span>外向きの場面で</span>
        <span>素のとき・親しい相手に</span>
        <span>大事な判断のときに</span>
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-2">
        {FACE_UNAVAILABLE.map((u) => (
          <span key={u.label} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-500">
            {u.label}：{u.reason}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
