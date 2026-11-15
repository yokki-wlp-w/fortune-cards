import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { NOTICE_REFERENCE } from '../content'
import { canUseFileHandle, getSyncFileName, syncWithFile } from '../sync/sync'
import { CardDetail } from './CardDetail'
import { CardList } from './CardList'
import { CompatView } from './CompatView'
import { SettingsView } from './SettingsView'
import { StatsView } from './StatsView'
import { navigate, useHashRoute } from './hooks'

const TABS = [
  { to: '/', label: 'カード', icon: '🃏' },
  { to: '/compat', label: '相性', icon: '🤝' },
  { to: '/stats', label: '的中率', icon: '📊' },
  { to: '/settings', label: '同期・設定', icon: '⚙️' },
]

/** ヘッダーの同期ボタン。同期ファイルが決まっている PC では押すだけで同期する */
function SyncButton() {
  const fileName = useLiveQuery(getSyncFileName)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  const onClick = async () => {
    if (!canUseFileHandle() || !fileName) return navigate('/settings')
    setState('busy')
    try {
      await syncWithFile()
      setState('done')
    } catch {
      setState('error')
      navigate('/settings')
    }
    setTimeout(() => setState('idle'), 2500)
  }
  const label = { idle: '同期', busy: '同期中…', done: '同期しました', error: '同期できません' }[state]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'busy'}
      className="min-h-10 rounded-full bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-60"
    >
      🔄 {label}
    </button>
  )
}

export function App() {
  const { path, params } = useHashRoute()
  const active = path.startsWith('/card/') ? '/' : path

  let page
  if (path.startsWith('/card/')) page = <CardDetail key={path} id={decodeURIComponent(path.slice(6))} />
  else if (path === '/compat') page = <CompatView a={params.get('a') ?? ''} b={params.get('b') ?? ''} />
  else if (path === '/stats') page = <StatsView />
  else if (path === '/settings') page = <SettingsView />
  else page = <CardList />

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="sticky top-0 z-20 bg-indigo-600 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={() => navigate('/')} className="text-lg font-black tracking-wide">
            人物カード
          </button>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="メニュー">
            {TABS.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => navigate(t.to)}
                aria-current={active === t.to ? 'page' : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${active === t.to ? 'bg-white text-indigo-700' : 'text-white hover:bg-white/15'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <SyncButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {page}
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">{NOTICE_REFERENCE}</p>
      </main>

      <nav
        aria-label="メニュー"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.to}
            type="button"
            onClick={() => navigate(t.to)}
            aria-current={active === t.to ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center text-[11px] font-semibold ${active === t.to ? 'text-indigo-700' : 'text-slate-500'}`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
