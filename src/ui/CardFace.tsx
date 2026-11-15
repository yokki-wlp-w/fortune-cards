import { KYUSEI_NAMES, animalFaces } from '../engine'
import { ANIMAL_TEXT, DAY_STEM_TEXT } from '../content'
import type { CardRecord } from '../db/db'
import { ELEMENT_STYLE, dayElement } from './common'

/** カードゲーム風のカード。動物タイプを「顔」にする */
export function CardFace({
  card,
  onClick,
  selected,
  size = 'md',
}: {
  card: CardRecord
  onClick?: () => void
  selected?: boolean
  size?: 'md' | 'lg'
}) {
  const c = card.derived
  const el = dayElement(c)
  const style = ELEMENT_STYLE[el]
  const animal = ANIMAL_TEXT[c.animal]
  const faces = animalFaces(c)
  const lg = size === 'lg'
  const body = (
    <div className={`flex h-full flex-col items-center rounded-[14px] bg-white ${lg ? 'p-4' : 'p-2.5'}`}>
      <div className="flex w-full items-center justify-between text-[11px] font-bold">
        <span className={`rounded-full px-2 py-0.5 ${style.chip}`}>
          {c.dayStem}・{el}
        </span>
        {c.boundary && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">境界日</span>}
      </div>
      <div className={`${lg ? 'my-2 text-7xl' : 'my-1 text-5xl'} leading-none`} aria-hidden>
        {animal.emoji}
      </div>
      <div className={`w-full truncate text-center font-bold text-slate-900 ${lg ? 'text-xl' : 'text-sm'}`}>{card.name}</div>
      <div className={`text-center text-slate-600 ${lg ? 'text-sm' : 'text-xs'}`}>{c.animal}</div>
      {lg && <div className="mt-1 text-center text-xs text-slate-500">{animal.tagline}</div>}
      <div className="mt-1.5 w-full border-t border-slate-100 pt-1.5 text-center text-[11px] leading-tight text-slate-500">
        <div>
          {DAY_STEM_TEXT[c.dayStem].image}／{KYUSEI_NAMES[c.kyusei.honmei]}
        </div>
        <div className="mt-1 flex justify-center gap-2 text-slate-600">
          <span title={`表面：${faces.hyomen}`}>
            表面 <span aria-hidden>{ANIMAL_TEXT[faces.hyomen].emoji}</span>
            <span className="sr-only">{faces.hyomen}</span>
          </span>
          <span title={`意思決定：${faces.ishikettei}`}>
            決定 <span aria-hidden>{ANIMAL_TEXT[faces.ishikettei].emoji}</span>
            <span className="sr-only">{faces.ishikettei}</span>
          </span>
        </div>
      </div>
      {card.tags.length > 0 && (
        <div className="mt-1 flex w-full flex-wrap justify-center gap-1">
          {card.tags.slice(0, lg ? 8 : 2).map((t) => (
            <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
  const frame = `block w-full rounded-2xl bg-gradient-to-br p-[3px] text-left shadow-md ${style.grad} ${
    selected ? 'ring-4 ring-indigo-500 ring-offset-2' : ''
  }`
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={`${card.name}（${c.animal}）のカードを開く`} className={`${frame} transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0`}>
      {body}
    </button>
  ) : (
    <div className={frame}>{body}</div>
  )
}
