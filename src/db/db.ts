// 端末内の保存（IndexedDB / Dexie）。データは端末の外に送信しない。
import Dexie, { type Table } from 'dexie'
import { ENGINE_VERSION, computeChart, type DerivedChart } from '../engine'
import type { SystemId } from '../content'

/** 同期のため、全レコードが id・更新日時・論理削除を持つ */
export interface Syncable {
  id: string
  updatedAt: number
  deletedAt?: number
}

export interface CardRecord extends Syncable {
  name: string
  /** "YYYY-MM-DD"。出生時刻・出生地・性別は持たない */
  birthDate: string
  tags: string[]
  memo?: string
  /** 算出に使った計算エンジンのバージョン */
  engineVersion: string
  /** 算出結果のキャッシュ（バージョンが違えば再計算する） */
  derived: DerivedChart
  createdAt: number
}

export type Verdict = 'hit' | 'miss' | 'unknown'

export interface FeedbackRecord extends Syncable {
  /** card: カードID / pair: 2枚のカードIDを並べたもの */
  kind: 'card' | 'pair'
  targetId: string
  /** 分析項目のキー（例: shichu.personality） */
  itemKey: string
  system: SystemId
  verdict: Verdict
  note?: string
}

export interface MetaRecord {
  key: string
  value: unknown
}

class AppDB extends Dexie {
  cards!: Table<CardRecord, string>
  feedback!: Table<FeedbackRecord, string>
  meta!: Table<MetaRecord, string>
  constructor() {
    super('fortune-cards')
    this.version(1).stores({
      cards: 'id, updatedAt',
      feedback: 'id, targetId, updatedAt',
      meta: 'key',
    })
  }
}

export const db = new AppDB()

export const pairId = (a: string, b: string): string => [a, b].sort().join('|')
export const feedbackId = (targetId: string, itemKey: string): string => `${targetId}::${itemKey}`

export interface CardInput {
  id?: string
  name: string
  birthDate: string
  tags: string[]
  memo?: string
}

export async function saveCard(input: CardInput): Promise<string> {
  const now = Date.now()
  const derived = computeChart(input.birthDate) // 不正な日付はここで例外になる
  const existing = input.id ? await db.cards.get(input.id) : undefined
  const id = existing?.id ?? crypto.randomUUID()
  await db.cards.put({
    id,
    name: input.name.trim(),
    birthDate: input.birthDate,
    tags: [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))],
    memo: input.memo?.trim() || undefined,
    engineVersion: ENGINE_VERSION,
    derived,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
  return id
}

/** 論理削除（同期先にも削除を伝えるため、レコード自体は残す） */
export async function deleteCard(id: string): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.cards, db.feedback, async () => {
    const card = await db.cards.get(id)
    if (!card) return
    // 名前・メモ・タグは削除時に消しておく
    await db.cards.put({ ...card, name: '', memo: undefined, tags: [], updatedAt: now, deletedAt: now })
    const related = await db.feedback.filter((f) => f.targetId.split('|').includes(id)).toArray()
    await db.feedback.bulkPut(related.map((f) => ({ ...f, note: undefined, updatedAt: now, deletedAt: now })))
  })
}

export async function setFeedback(
  target: { kind: 'card' | 'pair'; targetId: string; itemKey: string; system: SystemId },
  verdict: Verdict | null,
  note?: string,
): Promise<void> {
  const now = Date.now()
  const id = feedbackId(target.targetId, target.itemKey)
  if (verdict === null) {
    const cur = await db.feedback.get(id)
    if (cur) await db.feedback.put({ ...cur, note: undefined, updatedAt: now, deletedAt: now })
    return
  }
  await db.feedback.put({ id, ...target, verdict, note: note?.trim() || undefined, updatedAt: now })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
export async function deleteMeta(key: string): Promise<void> {
  await db.meta.delete(key)
}

/** 計算エンジンが更新されていたら、保存済みカードの算出結果を作り直す */
export async function refreshDerived(): Promise<void> {
  const stale = await db.cards.filter((c) => !c.deletedAt && c.engineVersion !== ENGINE_VERSION).toArray()
  if (stale.length === 0) return
  // 算出結果は生年月日から決まるので updatedAt は変えない
  await db.cards.bulkPut(stale.map((c) => ({ ...c, engineVersion: ENGINE_VERSION, derived: computeChart(c.birthDate) })))
}
