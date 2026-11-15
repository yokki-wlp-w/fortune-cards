import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ELEMENTS, stemElementIdx, type ChartCore, type Element } from '../engine'
import { SYSTEM_LABEL, type SystemId } from '../content'

/** 五行ごとの配色（カードの枠・チャートに使う） */
export const ELEMENT_STYLE: Record<Element, { grad: string; chip: string; hex: string }> = {
  木: { grad: 'from-emerald-400 to-teal-600', chip: 'bg-emerald-100 text-emerald-800', hex: '#10b981' },
  火: { grad: 'from-rose-400 to-orange-500', chip: 'bg-rose-100 text-rose-800', hex: '#f43f5e' },
  土: { grad: 'from-amber-400 to-yellow-600', chip: 'bg-amber-100 text-amber-800', hex: '#f59e0b' },
  金: { grad: 'from-slate-300 to-zinc-500', chip: 'bg-slate-200 text-slate-800', hex: '#71717a' },
  水: { grad: 'from-sky-400 to-indigo-600', chip: 'bg-sky-100 text-sky-800', hex: '#0ea5e9' },
}
export const dayElement = (c: ChartCore): Element => ELEMENTS[stemElementIdx(c.pillars.day.stem)]

const SYSTEM_CHIP: Record<SystemId, string> = {
  shichu: 'bg-indigo-100 text-indigo-800',
  kyusei: 'bg-teal-100 text-teal-800',
  animal: 'bg-orange-100 text-orange-800',
  numerology: 'bg-fuchsia-100 text-fuchsia-800',
}
export function SystemChip({ system }: { system: SystemId }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${SYSTEM_CHIP[system]}`}>
      {SYSTEM_LABEL[system]}
    </span>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  danger: 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 active:bg-rose-100',
  ghost: 'text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100',
}
export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  )
}

export function Panel({ title, children, action }: { title?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">{children}</p>
}

export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}
export const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
