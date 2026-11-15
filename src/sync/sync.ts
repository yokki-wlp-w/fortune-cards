// 同期ファイル方式の同期と、JSON のエクスポート／インポート。
// 「同期ファイルを読む → 端末内データと統合 → 書き戻す」を1回の操作で行う。サーバーや外部 API は使わない。
import { ENGINE_VERSION, computeChart } from '../engine'
import { SYSTEM_IDS } from '../content'
import { db, getMeta, setMeta, type CardRecord, type FeedbackRecord } from '../db/db'
import { mergeRecords } from './merge'
import { decryptEnvelope, encryptText, isEncrypted } from './crypto'

export const SYNC_FORMAT = 'fortune-cards-data'
export const SYNC_FILE_NAME = 'fortune-cards-sync.json'
export const META_PASSPHRASE = 'passphrase'
export const META_SYNC_HANDLE = 'syncHandle'
export const META_LAST_SYNC = 'lastSyncAt'

export interface Snapshot {
  format: typeof SYNC_FORMAT
  schema: 1
  engineVersion: string
  exportedAt: number
  cards: CardRecord[]
  feedback: FeedbackRecord[]
}

export interface SyncStats {
  incoming: number
  outgoing: number
  cards: number
}

export class PassphraseRequiredError extends Error {
  constructor() {
    super('このファイルは暗号化されています。設定でパスフレーズを入力してください')
  }
}

export async function buildSnapshot(): Promise<Snapshot> {
  return {
    format: SYNC_FORMAT,
    schema: 1,
    engineVersion: ENGINE_VERSION,
    exportedAt: Date.now(),
    cards: await db.cards.toArray(),
    feedback: await db.feedback.toArray(),
  }
}

/** 保存用の文字列にする。パスフレーズがあれば暗号化する */
export async function serialize(snapshot: Snapshot, passphrase?: string): Promise<string> {
  const json = JSON.stringify(snapshot)
  return passphrase ? encryptText(json, passphrase) : json
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

/** 読み込んだカードを検証する。算出結果はファイルを信用せず、生年月日から作り直す */
function sanitizeCard(raw: unknown): CardRecord | null {
  const r = raw as Partial<CardRecord>
  if (!r || !isStr(r.id) || !isNum(r.updatedAt) || !isStr(r.birthDate) || !isStr(r.name)) return null
  try {
    return {
      id: r.id,
      name: r.name.slice(0, 100),
      birthDate: r.birthDate,
      tags: Array.isArray(r.tags) ? r.tags.filter(isStr).map((t) => t.slice(0, 30)) : [],
      memo: isStr(r.memo) ? r.memo.slice(0, 2000) : undefined,
      engineVersion: ENGINE_VERSION,
      derived: computeChart(r.birthDate),
      createdAt: isNum(r.createdAt) ? r.createdAt : r.updatedAt,
      updatedAt: r.updatedAt,
      deletedAt: isNum(r.deletedAt) ? r.deletedAt : undefined,
    }
  } catch {
    return null
  }
}

function sanitizeFeedback(raw: unknown): FeedbackRecord | null {
  const r = raw as Partial<FeedbackRecord>
  if (!r || !isStr(r.id) || !isNum(r.updatedAt) || !isStr(r.targetId) || !isStr(r.itemKey)) return null
  if (r.kind !== 'card' && r.kind !== 'pair') return null
  if (!r.system || !SYSTEM_IDS.includes(r.system)) return null
  if (r.verdict !== 'hit' && r.verdict !== 'miss' && r.verdict !== 'unknown') return null
  return {
    id: r.id,
    kind: r.kind,
    targetId: r.targetId,
    itemKey: r.itemKey,
    system: r.system,
    verdict: r.verdict,
    note: isStr(r.note) ? r.note.slice(0, 2000) : undefined,
    updatedAt: r.updatedAt,
    deletedAt: isNum(r.deletedAt) ? r.deletedAt : undefined,
  }
}

/** ファイルの中身を読み取る。空なら null（新規の同期ファイル） */
export async function parse(text: string, passphrase?: string): Promise<Snapshot | null> {
  if (!text.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('ファイルを読み取れませんでした（このアプリのデータではないようです）')
  }
  if (isEncrypted(parsed)) {
    if (!passphrase) throw new PassphraseRequiredError()
    parsed = JSON.parse(await decryptEnvelope(parsed, passphrase))
  }
  const p = parsed as Partial<Snapshot>
  if (!p || p.format !== SYNC_FORMAT || !Array.isArray(p.cards) || !Array.isArray(p.feedback)) {
    throw new Error('このアプリのデータではないようです')
  }
  return {
    format: SYNC_FORMAT,
    schema: 1,
    engineVersion: ENGINE_VERSION,
    exportedAt: isNum(p.exportedAt) ? p.exportedAt : 0,
    cards: p.cards.map(sanitizeCard).filter((c): c is CardRecord => c !== null),
    feedback: p.feedback.map(sanitizeFeedback).filter((f): f is FeedbackRecord => f !== null),
  }
}

/** 読み込んだデータを端末内のデータに統合する */
export async function applySnapshot(remote: Snapshot | null): Promise<SyncStats> {
  return db.transaction('rw', db.cards, db.feedback, async () => {
    const cards = mergeRecords(await db.cards.toArray(), remote?.cards ?? [])
    const feedback = mergeRecords(await db.feedback.toArray(), remote?.feedback ?? [])
    await db.cards.bulkPut(cards.merged)
    await db.feedback.bulkPut(feedback.merged)
    return {
      incoming: cards.incoming + feedback.incoming,
      outgoing: cards.outgoing + feedback.outgoing,
      cards: cards.merged.filter((c) => !c.deletedAt).length,
    }
  })
}

// ---------- ファイルを直接読み書きできるブラウザ（PC の Chrome / Edge）向け ----------

// File System Access API は標準の型定義に含まれないため、必要な部分だけ定義する
interface FileHandle {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
  queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
}
interface PickerWindow {
  showOpenFilePicker?: (opts: object) => Promise<FileHandle[]>
  showSaveFilePicker?: (opts: object) => Promise<FileHandle>
}
const pickerWindow = (): PickerWindow => window as unknown as PickerWindow
const PICKER_TYPES = [{ description: '同期ファイル', accept: { 'application/json': ['.json'] } }]

/** 同期ファイルを直接読み書きできる環境か */
export const canUseFileHandle = (): boolean =>
  typeof window !== 'undefined' && !!pickerWindow().showOpenFilePicker && !!pickerWindow().showSaveFilePicker

export async function getSyncFileName(): Promise<string | undefined> {
  return (await getMeta<FileHandle>(META_SYNC_HANDLE))?.name
}

/** 同期ファイルの場所を決める。create=true なら新規作成、false なら既存ファイルを選ぶ */
export async function chooseSyncFile(create: boolean): Promise<string> {
  const w = pickerWindow()
  const handle = create
    ? await w.showSaveFilePicker!({ suggestedName: SYNC_FILE_NAME, types: PICKER_TYPES })
    : (await w.showOpenFilePicker!({ types: PICKER_TYPES, multiple: false }))[0]
  await setMeta(META_SYNC_HANDLE, handle)
  return handle.name
}

async function openSyncHandle(): Promise<FileHandle> {
  const handle = await getMeta<FileHandle>(META_SYNC_HANDLE)
  if (!handle) throw new Error('同期ファイルがまだ選ばれていません')
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
      throw new Error('同期ファイルへのアクセスが許可されませんでした')
    }
  }
  return handle
}

/**
 * 同期ファイルを読まずに、この端末のデータだけで書き直す。
 * パスフレーズが分からなくなって同期ファイルを開けないときの復旧用。
 * 同期ファイルにしかなかったデータは失われる。
 */
export async function overwriteSyncFile(): Promise<number> {
  const handle = await openSyncHandle()
  const passphrase = await getMeta<string>(META_PASSPHRASE)
  const snapshot = await buildSnapshot()
  const writable = await handle.createWritable()
  await writable.write(await serialize(snapshot, passphrase))
  await writable.close()
  await setMeta(META_LAST_SYNC, Date.now())
  return snapshot.cards.filter((c) => !c.deletedAt).length
}

/** ボタン1回の同期（PC）：読む → 統合 → 書き戻す */
export async function syncWithFile(): Promise<SyncStats> {
  const handle = await openSyncHandle()
  const passphrase = await getMeta<string>(META_PASSPHRASE)
  const text = await (await handle.getFile()).text()
  const stats = await applySnapshot(await parse(text, passphrase))
  const writable = await handle.createWritable()
  await writable.write(await serialize(await buildSnapshot(), passphrase))
  await writable.close()
  await setMeta(META_LAST_SYNC, Date.now())
  return stats
}

// ---------- ファイルを選んで読み込み、共有／保存で書き出す方式（iPhone など） ----------

/** 選んだファイルを端末内のデータに統合する（同期の前半、またはインポート） */
export async function importFile(file: File): Promise<SyncStats> {
  const passphrase = await getMeta<string>(META_PASSPHRASE)
  return applySnapshot(await parse(await file.text(), passphrase))
}

/** 書き出すファイルを作る。encrypt=false ならパスフレーズがあっても平文（バックアップ用） */
export async function buildExportFile(fileName: string, encrypt: boolean): Promise<File> {
  const passphrase = encrypt ? await getMeta<string>(META_PASSPHRASE) : undefined
  const text = await serialize(await buildSnapshot(), passphrase)
  return new File([text], fileName, { type: 'application/json' })
}

/** 共有シート（iPhone の「ファイルに保存」など）で渡す。使えなければダウンロードする */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded'> {
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
    return 'shared'
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export async function markSynced(): Promise<void> {
  await setMeta(META_LAST_SYNC, Date.now())
}
