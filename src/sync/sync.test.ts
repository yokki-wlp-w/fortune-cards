import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, deleteCard, deleteCase, deleteViewLog, recordView, saveCard, saveCase, setFeedback, setMeta, viewLogId } from '../db/db'
import { mergeRecords } from './merge'
import { decryptEnvelope, encryptText, isEncrypted, normalizePassphrase, passphraseCode, WrongPassphraseError } from './crypto'
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
  it('照合コードは同じ言葉なら同じ、違えば変わる', async () => {
    expect(await passphraseCode('あいことば1234')).toBe(await passphraseCode('あいことば1234'))
    expect(await passphraseCode('あいことば1234')).not.toBe(await passphraseCode('あいことば1235'))
    expect(await passphraseCode('abc')).toMatch(/^[0-9A-F]{4}$/)
  })
  it('前後の空白や全角英数の違いはそろえる', () => {
    expect(normalizePassphrase('  ａｂｃ１２３４５ ')).toBe('abc12345')
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
    await db.logs.clear()
    await db.cases.clear()
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

  it('計測ログは同じ組み合わせを1行にまとめ、ケースと一緒に同期される', async () => {
    const a = await saveCard({ name: 'A', birthDate: '1990-05-15', tags: [] })
    const b = await saveCard({ name: 'B', birthDate: '1988-12-01', tags: [] })
    const c = await saveCard({ name: 'C', birthDate: '2001-03-04', tags: [] })
    await recordView('pair', [a, b])
    await recordView('pair', [b, a]) // 順番が違っても同じ行
    await recordView('team', [c, a, b])
    await recordView('pair', [a]) // 1人だけは記録しない
    expect(await db.logs.count()).toBe(2)
    expect((await db.logs.get(viewLogId('pair', [a, b])))?.memberIds).toEqual([a, b].sort())

    const caseId = await saveCase({
      title: '立ち上げ', date: '2026-11-15', kind: 'team', memberIds: [a, b, c],
      scene: '新規案件', reading: '見立て', outcome: '', learning: '', usefulness: 'useful', tags: ['配置'], snapshot: ['仕事 70点'],
    })
    const file = await serialize(await buildSnapshot(), 'pass')
    await db.logs.clear()
    await db.cases.clear()
    await applySnapshot(await parse(file, 'pass'))
    expect(await db.logs.count()).toBe(2)
    expect((await db.cases.get(caseId))?.snapshot).toEqual(['仕事 70点'])

    // カードを消すと、その人を含むログも消える（ケースは残る）
    await new Promise((r) => setTimeout(r, 5))
    await deleteCard(a)
    expect((await db.logs.toArray()).every((l) => l.deletedAt)).toBe(true)
    expect((await db.cases.get(caseId))?.deletedAt).toBeUndefined()
    await deleteViewLog(viewLogId('team', [a, b, c]))
    await deleteCase(caseId)
    expect((await db.cases.get(caseId))?.title).toBe('')
  })

  it('古い版で作ったファイル（ログ・ケースなし）も読める', async () => {
    const snap = await parse(JSON.stringify({ format: 'fortune-cards-data', cards: [], feedback: [] }))
    expect(snap?.logs).toEqual([])
    expect(snap?.cases).toEqual([])
    const bad = await parse(
      JSON.stringify({
        format: 'fortune-cards-data', cards: [], feedback: [],
        logs: [{ id: 'x', kind: 'pair', memberIds: ['only-one'], updatedAt: 1 }, { id: 'y', kind: 'other', memberIds: ['a', 'b'], updatedAt: 1 }],
        cases: [{ id: 'z', title: 't', kind: 'team', updatedAt: 1, usefulness: 'great', date: 'bad' }, { id: 'w', kind: 'team', updatedAt: 1 }],
      }),
    )
    expect(bad?.logs).toEqual([])
    expect(bad?.cases).toHaveLength(1)
    expect(bad?.cases[0].usefulness).toBeUndefined()
    expect(bad?.cases[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('設定のパスフレーズは同期データに含めない', async () => {
    await setMeta(META_PASSPHRASE, 'himitsu')
    await saveCard({ name: 'A', birthDate: '2000-01-01', tags: [] })
    expect(JSON.stringify(await buildSnapshot())).not.toContain('himitsu')
  })
})
