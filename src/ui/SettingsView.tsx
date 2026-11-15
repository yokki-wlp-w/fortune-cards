import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ENGINE_VERSION } from '../engine'
import { NOTICE_ANIMAL, NOTICE_CONSENT, NOTICE_REFERENCE } from '../content'
import { db, deleteMeta, setMeta } from '../db/db'
import { buildExcelFile } from '../export/excel'
import {
  META_LAST_SYNC,
  META_PASSPHRASE,
  SYNC_FILE_NAME,
  buildExportFile,
  canUseFileHandle,
  chooseSyncFile,
  getSyncFileName,
  importFile,
  markSynced,
  overwriteSyncFile,
  shareOrDownload,
  syncWithFile,
  type SyncStats,
} from '../sync/sync'
import { normalizePassphrase, passphraseCode } from '../sync/crypto'
import { Button, Notice, Panel, formatDateTime } from './common'
import { useMeta } from './hooks'

type Message = { ok: boolean; text: string } | null
const describe = (s: SyncStats) => `取り込み ${s.incoming}件／書き出し ${s.outgoing}件（カード ${s.cards}枚）`
const errorText = (e: unknown): string | null => {
  // ファイル選択や共有をキャンセルしただけなら、エラーとして表示しない
  if (e instanceof DOMException && e.name === 'AbortError') return null
  return e instanceof Error ? e.message : '処理に失敗しました'
}

function Result({ message }: { message: Message }) {
  if (!message) return null
  return (
    <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
      {message.text}
    </p>
  )
}

function PassphrasePanel() {
  const saved = useMeta<string>(META_PASSPHRASE)
  const code = useLiveQuery(async () => (saved ? passphraseCode(saved) : ''), [saved])
  const [value, setValue] = useState('')
  // 打ち間違いに気づけるよう、入力中の文字は最初から見える状態にする
  const [show, setShow] = useState(true)
  const [message, setMessage] = useState<Message>(null)

  const save = async () => {
    const normalized = normalizePassphrase(value)
    if (normalized.length < 8) return setMessage({ ok: false, text: '8文字以上で入力してください' })
    await setMeta(META_PASSPHRASE, normalized)
    setValue('')
    setMessage({
      ok: true,
      text: `この端末にパスフレーズを保存しました（照合コード ${await passphraseCode(normalized)}）。もう一方の端末でも同じ照合コードになっていれば、同じ言葉です。`,
    })
  }
  const clear = async () => {
    if (!window.confirm('この端末のパスフレーズを消します。次の同期から、同期ファイルは暗号化されなくなります。よろしいですか？')) return
    await deleteMeta(META_PASSPHRASE)
    setMessage({ ok: true, text: 'パスフレーズを消しました。' })
  }

  return (
    <Panel title="パスフレーズ（同期ファイルの暗号化）">
      <p className="text-sm leading-relaxed text-slate-700">
        同期ファイルに鍵をかけるための合言葉です。<strong>PC と iPhone の両方で同じ言葉</strong>を一度入力してください。端末が覚えるので、毎回の入力は不要です。
      </p>
      <p className="mt-2 text-sm font-semibold">
        現在の状態：{saved ? <span className="text-emerald-700">設定済み（暗号化して同期します）</span> : <span className="text-amber-700">未設定（暗号化しません）</span>}
      </p>
      {saved && code && (
        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          照合コード：<span className="font-mono text-lg font-black tracking-widest text-slate-900">{code}</span>
          <br />
          <span className="text-xs text-slate-500">
            同じ言葉を保存した端末では、同じコードが表示されます。コードが違う場合は、どちらかの言葉が違っています。
          </span>
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={saved ? '新しいパスフレーズに変更' : 'パスフレーズ（8文字以上）'}
          aria-label="パスフレーズ"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
        />
        <Button onClick={() => setShow((v) => !v)}>{show ? '隠す' : '表示'}</Button>
      </div>
      <div className="mt-2 flex gap-2">
        <Button variant="primary" onClick={save} disabled={!value}>
          保存
        </Button>
        {saved && (
          <Button variant="danger" onClick={clear}>
            消す
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        忘れた場合：端末内のデータは残ります。新しいパスフレーズを両方の端末で設定し、同期ファイルを新しく作り直してください。変更したときも、もう一方の端末で同じ言葉に更新してください。
      </p>
      <Result message={message} />
    </Panel>
  )
}

/** PC（Chrome / Edge）：同期ファイルを直接読み書きする。ボタン1回で同期 */
function HandleSync() {
  const fileName = useLiveQuery(getSyncFileName)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ ok: true, text: await fn() })
    } catch (e) {
      const text = errorText(e)
      if (text) setMessage({ ok: false, text })
    }
    setBusy(false)
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-slate-700">
        「同期ファイル」という1つのファイルを <strong>OneDrive</strong> に置き、PC と iPhone がそれぞれ読み書きすることで、データをそろえます。
      </p>
      {fileName ? (
        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          準備完了です。同期ファイル：<span className="font-semibold">{fileName}</span>
          <br />
          カードを追加・編集したあとに「今すぐ同期」（または画面右上の「同期」）を押してください。
        </p>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-900">はじめての設定（この PC で1回だけ）</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
            <li>下の「パスフレーズ」欄で合言葉を決めて保存します（おすすめ）。</li>
            <li>
              「同期ファイルを新しく作る」を押し、保存先に <strong>OneDrive のフォルダ</strong>を選んで保存します。
            </li>
            <li>「今すぐ同期」を押します。これで OneDrive にデータが書き出されます。</li>
          </ol>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            すでに別の端末で同期ファイルを作ってある場合は、手順2の代わりに「既存の同期ファイルを選ぶ」で、そのファイルを選んでください。
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy || !fileName} onClick={() => run(async () => `同期しました。${describe(await syncWithFile())}`)}>
          今すぐ同期
        </Button>
        <Button disabled={busy} onClick={() => run(async () => `「${await chooseSyncFile(true)}」を同期ファイルにしました。「今すぐ同期」を押してください。`)}>
          同期ファイルを新しく作る
        </Button>
        <Button disabled={busy} onClick={() => run(async () => `「${await chooseSyncFile(false)}」を同期ファイルにしました。「今すぐ同期」を押してください。`)}>
          既存の同期ファイルを選ぶ
        </Button>
      </div>
      <Result message={message} />
      {fileName && (
        <details className="mt-3 rounded-xl bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">うまく同期できないとき</summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            パスフレーズが分からなくなり同期ファイルを開けない場合は、<strong>データが入っている端末</strong>で下のボタンを押すと、同期ファイルをこの端末のデータと今のパスフレーズで作り直せます。
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            同期ファイルの中身は読まずに置き換えます。他の端末で追加してまだこの端末に取り込んでいないデータがある場合、それは同期ファイルから消えます（その端末の中には残ります）。
          </p>
          <Button
            variant="danger"
            className="mt-2"
            disabled={busy}
            onClick={() => {
              if (!window.confirm('同期ファイルを、この端末のデータと現在のパスフレーズで作り直します。同期ファイルの今の中身は置き換えられます。よろしいですか？')) return
              void run(async () => `同期ファイルを作り直しました（カード ${await overwriteSyncFile()}枚）。もう一方の端末で、同じパスフレーズを保存してから同期してください。`)
            }}
          >
            この端末のデータで同期ファイルを作り直す
          </Button>
        </details>
      )}
    </>
  )
}

/** iPhone など：ファイルを選んで取り込み、共有シートで書き戻す（2ステップ） */
function ManualSync() {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const s = await importFile(file)
      setLoaded(true)
      setMessage({ ok: true, text: `読み込みました。${describe(s)}。続けて ② で保存してください。` })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) ?? '読み込めませんでした' })
    }
    setBusy(false)
  }
  const save = async () => {
    setBusy(true)
    try {
      const how = await shareOrDownload(await buildExportFile(SYNC_FILE_NAME, true))
      await markSynced()
      setLoaded(false)
      setMessage({
        ok: true,
        text: how === 'shared' ? '書き出しました。OneDrive の同じ場所に保存（置き換え）すると同期完了です。' : `「${SYNC_FILE_NAME}」をダウンロードしました。OneDrive の同期ファイルと置き換えてください。`,
      })
    } catch (err) {
      const text = errorText(err)
      if (text) setMessage({ ok: false, text })
    }
    setBusy(false)
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-slate-700">
        OneDrive にある「同期ファイル」を読み込み、この端末のデータと合わせてから、同じ場所に保存し直します。
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
        <li>（初回のみ）OneDrive アプリを入れてサインインし、下の「パスフレーズ」欄に PC と同じ合言葉を保存します。</li>
        <li>
          「① 同期ファイルを読み込む」を押し、「ファイルを選択」から OneDrive にある <strong>{SYNC_FILE_NAME}</strong> を選びます。
        </li>
        <li>「② 同期ファイルを保存する」を押し、「ファイルに保存」で OneDrive の同じ場所を選んで置き換えます。</li>
      </ol>
      <p className="mt-2 text-xs text-slate-500">この端末のブラウザはファイルを直接書き換えられないため、2ステップになります。初回で同期ファイルがまだない場合は ② だけ行ってください。</p>
      <input ref={input} type="file" accept=".json,application/json" onChange={onPick} className="hidden" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button variant={loaded ? 'secondary' : 'primary'} disabled={busy} onClick={() => input.current?.click()}>
          ① 同期ファイルを読み込む
        </Button>
        <Button variant={loaded ? 'primary' : 'secondary'} disabled={busy} onClick={save}>
          ② 同期ファイルを保存する
        </Button>
      </div>
      <Result message={message} />
    </>
  )
}

function BackupPanel() {
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message>(null)

  const exportJson = async () => {
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      await shareOrDownload(await buildExportFile(`fortune-cards-backup-${stamp}.json`, false))
      setMessage({ ok: true, text: 'バックアップを書き出しました。このファイルは暗号化されていないので、保管場所にご注意ください。' })
    } catch (err) {
      const text = errorText(err)
      if (text) setMessage({ ok: false, text })
    }
  }
  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setMessage({ ok: true, text: `インポートしました。${describe(await importFile(file))}` })
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) ?? '読み込めませんでした' })
    }
  }

  const exportExcel = async () => {
    try {
      const cards = (await db.cards.toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.createdAt - b.createdAt)
      if (cards.length === 0) return setMessage({ ok: false, text: '出力するカードがありません' })
      const stamp = new Date().toISOString().slice(0, 10)
      const cases = (await db.cases.toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.date.localeCompare(b.date))
      await shareOrDownload(await buildExcelFile(cards, cases, `fortune-cards-${stamp}.xlsx`))
      const pairs = (cards.length * (cards.length - 1)) / 2
      setMessage({ ok: true, text: `Excel ファイルを出力しました（カード ${cards.length}枚、相性 ${pairs}組、ケース ${cases.length}件）。名前と生年月日が含まれるので、取り扱いにご注意ください。` })
    } catch (err) {
      const text = errorText(err)
      if (text) setMessage({ ok: false, text })
    }
  }

  return (
    <Panel title="バックアップと Excel 出力">
      <p className="text-sm leading-relaxed text-slate-700">
        全データを JSON ファイルに書き出します。インポートは、今あるデータに<strong>統合</strong>されます（同じカードは新しい方を採用し、上書きで消えることはありません）。
      </p>
      <input ref={input} type="file" accept=".json,application/json" onChange={onPick} className="hidden" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={exportJson}>エクスポート</Button>
        <Button onClick={() => input.current?.click()}>インポート</Button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        カード一覧、全員の組み合わせの相性結果、ケース一覧を Excel ファイル（.xlsx）に出力します。
      </p>
      <div className="mt-2">
        <Button onClick={exportExcel}>Excel に出力</Button>
      </div>
      <Result message={message} />
    </Panel>
  )
}

export function SettingsView() {
  const lastSync = useMeta<number>(META_LAST_SYNC)
  const direct = canUseFileHandle()
  return (
    <div className="space-y-4">
      <Panel title="端末間の同期" action={<span className="text-xs text-slate-500">最終同期：{lastSync ? formatDateTime(lastSync) : 'まだ'}</span>}>
        {direct ? <HandleSync /> : <ManualSync />}
      </Panel>
      {direct && (
        <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer text-sm font-bold">手動で同期する（ファイルを選ぶ方式）</summary>
          <div className="mt-3">
            <ManualSync />
          </div>
        </details>
      )}
      <PassphrasePanel />
      <BackupPanel />
      <Panel title="このアプリについて">
        <div className="space-y-2">
          <Notice>{NOTICE_REFERENCE}</Notice>
          <Notice>{NOTICE_CONSENT}</Notice>
          <Notice>{NOTICE_ANIMAL}</Notice>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          <li>データはこの端末の中だけに保存され、外部のサーバーには送信されません。</li>
          <li>同期は、あなたが選んだ同期ファイルを読み書きすることで行います。</li>
          <li>iPhone では、共有ボタンから「ホーム画面に追加」するとアプリのように使えます。ホーム画面のアプリと Safari ではデータの保存場所が別になるため、どちらか一方で使ってください。</li>
          <li>文章はあらかじめ用意したテンプレートの組み合わせで、AI による生成は行っていません。</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">計算エンジン v{ENGINE_VERSION}</p>
      </Panel>
    </div>
  )
}
