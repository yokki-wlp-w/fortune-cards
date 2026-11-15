import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, deleteCard, saveCard, setFeedback, setMeta } from '../db/db'
import { mergeRecords } from './merge'
import { decryptEnvelope, encryptText, isEncrypted, WrongPassphraseError } from './crypto'
import { applySnapshot, buildSnapshot, META_PASSPHRASE, parse, PassphraseRequiredError, serialize } from './sync'

describe('mergeRecords', () => {
  it('新しい方を採用し、片方にしかないものは両方残す', () => {
    const local = [
      { id: 'a', updatedAt: 10, v: 'local-a' },
      { id: 'b', updatedAt: 30, v: 'local-b' },
    ]
    const remote = [
      { id: 'a', updatedAt: 20, v: 'remote-a' },
      { id: 'b', updatedAt: 5, v: 'remote-b' },
      { id: 'c', updatedAt: 1, v: 'remote-c' },
    ]
    const r = mergeRecords(local, remote)
    const byId = Object.fromEntries(r.merged.map((x) => [x.id, x.v]))
    expect(byId).toEqual({ a: 'remote-a', b: 'local-b', c: 'remote-c' })
    expect(r.incoming).toBe(2)
    expect(r.outgoing).toBe(1)
  })
  it('同じ更新日時なら手元を維持する', () => {
    const r = mergeRecords([{ id: 'a', updatedAt: 10, v: 1 }], [{ id: 'a', updatedAt: 10, v: 2 }])
    expect(r.merged[0].v).toBe(1)
    expect([r.incoming, r.outgoing]).toEqual([0, 0])
  })
})

describe('暗号化', () => {
  it('同じパスフレーズで元に戻せる', async () => {
    const text = await encryptText('こんにちは {"a":1}', 'あいことば')
    const env = JSON.parse(text)
    expect(isEncrypted(env)).toBe(true)
    expect(text).not.toContain('こんにちは')
    expect(await decryptEnvelope(env, 'あいことば')).toBe('こんにちは {"a":1}')
  })
  it('違うパスフレーズでは開けない', async () => {
    const env = JSON.parse(await encryptText('secret', 'right'))
    await expect(decryptEnvelope(env, 'wrong')).rejects.toBeInstanceOf(WrongPassphraseError)
  })
})

describe('同期の往復', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.feedback.clear()
    await db.meta.clear()
  })

  it('端末Aの書き出しを端末Bが取り込み、削除も伝わる', async () => {
    // 端末A
    const id1 = await saveCard({ name: 'たろう', birthDate: '1990-05-15', tags: ['家族'] })
    const id2 = await saveCard({ name: 'はなこ', birthDate: '1988-12-01', tags: ['仕事'] })
    await setFeedback({ kind: 'card', targetId: id1, itemKey: 'shichu.personality', system: 'shichu' }, 'hit', 'その通り')
    const fileA = await serialize(await buildSnapshot(), 'pass')
    expect(fileA).not.toContain('たろう')

    // 端末B（空の状態）で取り込む
    await db.cards.clear()
    await db.feedback.clear()
    const s1 = await applySnapshot(await parse(fileA, 'pass'))
    expect(s1.cards).toBe(2)
    expect(s1.incoming).toBe(3)
    expect((await db.cards.get(id1))?.derived.pillars.day.label).toBeTruthy()

    // 端末Bで1件削除して書き出し → もう一度取り込んでも削除が保たれる
    await new Promise((r) => setTimeout(r, 5))
    await deleteCard(id2)
    const fileB = await serialize(await buildSnapshot())
    const s2 = await applySnapshot(await parse(fileA, 'pass'))
    expect(s2.cards).toBe(1)
    expect((await db.cards.get(id2))?.deletedAt).toBeTruthy()
    expect((await db.cards.get(id2))?.name).toBe('')
    expect(fileB).toContain('たろう') // パスフレーズなしは平文
  })

  it('暗号化ファイルはパスフレーズがないと読めない', async () => {
    await saveCard({ name: 'A', birthDate: '2000-01-01', tags: [] })
    const file = await serialize(await buildSnapshot(), 'pass')
    await expect(parse(file)).rejects.toBeInstanceOf(PassphraseRequiredError)
    await expect(parse(file, 'bad')).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('不正なデータは取り込まない', async () => {
    await expect(parse('not json')).rejects.toThrow()
    await expect(parse('{"format":"other"}')).rejects.toThrow()
    const snap = await parse(
      JSON.stringify({
        format: 'fortune-cards-data',
        cards: [
          { id: 'x', name: 'bad date', birthDate: '2023-02-30', updatedAt: 1 },
          { id: 'y', name: 'ok', birthDate: '2001-03-04', updatedAt: 1, derived: { animal: '改ざん' } },
          { name: 'no id', birthDate: '2001-03-04', updatedAt: 1 },
        ],
        feedback: [{ id: 'f', targetId: 'y', itemKey: 'k', kind: 'card', system: 'unknown-system', verdict: 'hit', updatedAt: 1 }],
      }),
    )
    expect(snap?.cards.map((c) => c.id)).toEqual(['y'])
    expect(snap?.cards[0].derived.animal).not.toBe('改ざん')
    expect(snap?.feedback).toHaveLength(0)
    expect(await parse('')).toBeNull()
  })

  it('設定のパスフレーズは同期データに含めない', async () => {
    await setMeta(META_PASSPHRASE, 'himitsu')
    await saveCard({ name: 'A', birthDate: '2000-01-01', tags: [] })
    expect(JSON.stringify(await buildSnapshot())).not.toContain('himitsu')
  })
})
