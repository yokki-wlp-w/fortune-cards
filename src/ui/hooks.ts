import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CardRecord, type FeedbackRecord } from '../db/db'

/** 削除されていないカード（新しい順）。読み込み中は undefined */
export function useCards(): CardRecord[] | undefined {
  return useLiveQuery(async () =>
    (await db.cards.toArray()).filter((c) => !c.deletedAt).sort((a, b) => b.createdAt - a.createdAt),
  )
}

/** 対象（カードまたはペア）のフィードバックを、項目キー → レコードで返す */
export function useFeedbackMap(targetId: string | undefined): Map<string, FeedbackRecord> {
  const rows = useLiveQuery(
    async () => (targetId ? db.feedback.where('targetId').equals(targetId).toArray() : []),
    [targetId],
  )
  return new Map((rows ?? []).filter((f) => !f.deletedAt).map((f) => [f.itemKey, f]))
}

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key])
}

export interface Route {
  path: string
  params: URLSearchParams
}
const readRoute = (): Route => {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path, params: new URLSearchParams(query) }
}
/** ハッシュ（#/...）を使った簡易ルーティング。静的ホスティングでそのまま動く */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
export const navigate = (to: string): void => {
  window.location.hash = to
}
