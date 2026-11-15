// 2つの端末のデータを統合する純粋関数。同じ id は更新日時が新しい方を採用する（削除も同じ扱い）。

export interface Mergeable {
  id: string
  updatedAt: number
}

export interface MergeResult<T> {
  merged: T[]
  /** 手元より新しかった（＝取り込んだ）相手側レコードの件数 */
  incoming: number
  /** 相手側より新しかった（＝書き出す）手元レコードの件数 */
  outgoing: number
}

export function mergeRecords<T extends Mergeable>(local: T[], remote: T[]): MergeResult<T> {
  const map = new Map<string, T>(local.map((r) => [r.id, r]))
  const remoteIds = new Map<string, T>(remote.map((r) => [r.id, r]))
  let incoming = 0
  for (const r of remote) {
    const cur = map.get(r.id)
    if (!cur || r.updatedAt > cur.updatedAt) {
      map.set(r.id, r)
      incoming++
    }
  }
  let outgoing = 0
  for (const l of local) {
    const other = remoteIds.get(l.id)
    if (!other || l.updatedAt > other.updatedAt) outgoing++
  }
  return { merged: [...map.values()], incoming, outgoing }
}
