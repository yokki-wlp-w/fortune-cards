// 相性の因子を文章にする。すべて自作。否定的な内容は関わり方の工夫とセットで書く。
import type { CompatFactor, CompatSystem, Position } from '../engine'

export interface CompatLine {
  /** フィードバックの記録キー（因子のキー） */
  key: string
  system: CompatSystem
  tone: 'good' | 'caution'
  title: string
  text: string
  /** 関わる際の注意点・活かし方 */
  advice: string
}

const POSITION_LABEL: Record<Position, string> = {
  day: '日支（本質・ふだんの素顔）',
  month: '月支（仕事・社会での顔）',
  year: '年支（育った背景・世代の感覚）',
}

export function describeFactor(f: CompatFactor, names: [string, string]): CompatLine {
  const from = f.params.from !== undefined ? names[f.params.from] : ''
  const to = f.params.to !== undefined ? names[f.params.to] : ''
  const [a, b] = names
  const detail = f.params.detail ?? ''
  const pos = f.params.position ? POSITION_LABEL[f.params.position] : ''
  const base = { key: f.key + (f.params.position ? `.${f.params.position}` : ''), system: f.system }

  switch (f.key) {
    case 'stem.kango':
      return {
        ...base,
        tone: 'good',
        title: `日干が「干合」の関係（${detail}）`,
        text: '互いに引き合い、自然と歩み寄りやすい組み合わせとされます。違うタイプでも、一緒にいると落ち着きやすい傾向があります。',
        advice: '居心地がよいぶん、なあなあになりやすい面もあります。仕事では役割と期限を言葉にしておくと安心です。',
      }
    case 'stem.same':
      return {
        ...base,
        tone: 'good',
        title: `日干の五行が同じ（${detail}）`,
        text: '物事の捉え方や進め方が似やすく、説明が少なくても通じやすい傾向があります。',
        advice: '似ているぶん、張り合ったり同じ点を見落としたりしやすいので、担当を分けておくとよさそうです。',
      }
    case 'stem.gen':
      return {
        ...base,
        tone: 'good',
        title: `${from}さんが${to}さんを後押ししやすい（${detail}）`,
        text: `${from}さんの持ち味が、${to}さんの力を引き出しやすい「相生」の関係です。${to}さんはのびのび動きやすい傾向があります。`,
        advice: `支える側の${from}さんに負担が偏りやすいので、${to}さんから感謝やお返しを言葉にすると関係が長続きしやすくなります。`,
      }
    case 'stem.ctrl':
      return {
        ...base,
        tone: 'caution',
        title: `${from}さんが主導権を握りやすい（${detail}）`,
        text: `${from}さんの言動が${to}さんには強く響きやすい「相剋」の関係です。${to}さんが窮屈さを感じる場面が出やすい傾向があります。`,
        advice: `緊張感は、点検役と実行役として組むと成果につながりやすくなります。${from}さんは要望を「依頼」の形で伝え、${to}さんは早めに意見を返すとよさそうです。`,
      }
    case 'branch.same':
      return {
        ...base,
        tone: 'good',
        title: `${pos}が同じ（${detail}）`,
        text: '生活のリズムや感覚が近く、共感しやすい傾向があります。',
        advice: '同じ時期に調子を崩しやすい面もあるので、忙しい時期は早めに声をかけ合うと安心です。',
      }
    case 'branch.rikugo':
      return {
        ...base,
        tone: 'good',
        title: `${pos}が「支合」（${detail}）`,
        text: '互いに結びつきやすく、一緒にいて安心感を得やすい組み合わせとされます。',
        advice: '関係が安定しやすいぶん、変化が少なくなりがちです。ときどき新しい取り組みを入れると活性化します。',
      }
    case 'branch.sango':
      return {
        ...base,
        tone: 'good',
        title: `${pos}が「三合」の仲間（${detail}）`,
        text: '同じ方向を向いて力を合わせやすい組み合わせとされます。共通の目標があると勢いが出やすい傾向があります。',
        advice: '勢いがつくと周りが見えにくくなることがあります。節目で第三者の意見を聞くとバランスが取れます。',
      }
    case 'branch.chu':
      return {
        ...base,
        tone: 'caution',
        title: `${pos}が「冲」（${detail}）`,
        text: '正反対の性質を持ち、意見や動き方がぶつかりやすい組み合わせとされます。',
        advice: '違いは、互いの死角を補う材料にもなります。結論を急がず、まず相手の前提を聞く時間を取るとよさそうです。',
      }
    case 'branch.kei':
      return {
        ...base,
        tone: 'caution',
        title: `${pos}が「刑」（${detail}）`,
        text: '細かな行き違いが重なり、気疲れしやすい組み合わせとされます。',
        advice: '期待や役割を曖昧にせず、こまめに確認し合うと、すれ違いを減らしやすくなります。',
      }
    case 'branch.gai':
      return {
        ...base,
        tone: 'caution',
        title: `${pos}が「害」（${detail}）`,
        text: '悪気がなくても、相手のペースを乱してしまいやすい組み合わせとされます。',
        advice: '予定や段取りを前もって共有し、干渉しすぎない距離感を保つと付き合いやすくなります。',
      }
    case 'element.complement':
      return {
        ...base,
        key: `${f.key}.${detail}`,
        tone: 'good',
        title: `${to}さんに少ない「${detail}」を${from}さんが補える`,
        text: `五行の「${detail}」は${to}さんに少なく、${from}さんに多い要素です。苦手を補い合える組み合わせとされます。`,
        advice: `${from}さんの得意分野として任せ、${to}さんは別の面で返す形にすると、補完関係が続きやすくなります。`,
      }
    case 'kyusei.same':
      return {
        ...base,
        tone: 'good',
        title: '本命星の五行が同じ（比和）',
        text: '考え方の土台が近く、気心が知れやすい組み合わせとされます。',
        advice: '同じ方向に偏りやすいので、違うタイプの意見も取り入れると視野が広がります。',
      }
    case 'kyusei.gen':
      return {
        ...base,
        tone: 'good',
        title: `本命星が相生：${from}さんが${to}さんを活かしやすい`,
        text: `${from}さんの働きかけが、${to}さんの力を伸ばしやすい組み合わせとされます。`,
        advice: `${to}さんは受け取るだけでなく、成果や感謝を${from}さんに返すと、良い循環が続きやすくなります。`,
      }
    case 'kyusei.ctrl':
      return {
        ...base,
        tone: 'caution',
        title: `本命星が相剋：${from}さんが${to}さんを抑えやすい`,
        text: `${from}さんのペースが、${to}さんの持ち味を抑えてしまいやすい組み合わせとされます。`,
        advice: `${a}さんと${b}さんの間に、やり方を決めつけないルール（例：まず相手の案を最後まで聞く）を置くと、ぶつかりにくくなります。`,
      }
    default:
      return { ...base, tone: 'good', title: f.key, text: '', advice: '' }
  }
}

export function kuubouNote(owner: string, other: string): string {
  return `${other}さんの日支は、${owner}さんの空亡（天中殺）にあたります。${owner}さんにとって${other}さんは、理屈より縁で結びつきやすい相手とされます。期待をかけすぎず、自然体で関わるとよさそうです。`
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'とても噛み合いやすい'
  if (score >= 65) return '噛み合いやすい'
  if (score >= 50) return '工夫しだいで噛み合う'
  return 'すれ違いやすい（関わり方の工夫が有効）'
}
