// 命式から人物カードの文章を組み立てる（テンプレートの組み合わせ。AI は使わない）。
import { ELEMENTS, ELEMENT_LACK, ELEMENT_RICH, KYUSEI_NAMES, animalFaces, type ChartCore, type DerivedChart } from '../engine'
import { DAY_STEM_TEXT, type Caution } from './dayStem'
import { ANIMAL_TEXT } from './animals'
import { ANIMAL_FACE_TEXT, FACE_ROLE_TEXT } from './faces'

export const HEADING_FACES = '動物タイプで見る3つの顔'
export const HEADING_ELEMENTS = '五行バランス'
import { ELEMENT_TEXT, KYUSEI_TEXT, LIFE_PATH_TEXT, TSUHEN_WORK } from './stars'

export type SystemId = 'shichu' | 'kyusei' | 'animal' | 'numerology'
export const SYSTEM_LABEL: Record<SystemId, string> = {
  shichu: '四柱推命',
  kyusei: '九星気学',
  animal: '動物タイプ',
  numerology: '数秘術',
}
export const SYSTEM_IDS: SystemId[] = ['shichu', 'kyusei', 'animal', 'numerology']

export interface ProfileItem {
  /** フィードバックの記録キー */
  key: string
  system: SystemId
  /** 根拠（例: 日干「甲」） */
  source: string
  text?: string
  list?: string[]
  cautions?: Caution[]
}
export interface ProfileSection {
  heading: string
  items: ProfileItem[]
}

export function buildProfile(chart: DerivedChart | ChartCore): ProfileSection[] {
  const stem = DAY_STEM_TEXT[chart.dayStem]
  const animal = ANIMAL_TEXT[chart.animal]
  const work = TSUHEN_WORK[chart.tsuhensei.monthBranch]
  const honmei = KYUSEI_TEXT[chart.kyusei.honmei]
  const getsumei = KYUSEI_TEXT[chart.kyusei.getsumei]
  const stemSrc = `日干「${chart.dayStem}」（${stem.image}）`
  const honmeiSrc = `本命星「${KYUSEI_NAMES[chart.kyusei.honmei]}」`

  const rich = ELEMENTS.filter((e) => chart.elements[e] >= ELEMENT_RICH)
  const lack = ELEMENTS.filter((e) => chart.elements[e] <= ELEMENT_LACK)
  const elementLines = [...rich.map((e) => ELEMENT_TEXT[e].rich), ...lack.map((e) => ELEMENT_TEXT[e].lack)]
  if (elementLines.length === 0) elementLines.push('五行に大きな偏りは見られず、バランスを取りやすい傾向があります。')

  const basic: ProfileItem[] = [
    { key: 'shichu.personality', system: 'shichu', source: stemSrc, text: stem.personality },
    { key: 'animal.personality', system: 'animal', source: `動物タイプ「${chart.animal}」`, text: animal.description },
  ]
  if ('lifePath' in chart) {
    const lp = LIFE_PATH_TEXT[chart.lifePath]
    basic.push({
      key: 'numerology.lifePath',
      system: 'numerology',
      source: `ライフパスナンバー ${chart.lifePath}（${lp.keyword}）`,
      text: lp.text,
    })
  }

  const faces = animalFaces(chart)
  const faceItem = (role: 'hyomen' | 'ishikettei', key: string): ProfileItem => ({
    key,
    system: 'animal',
    source: `${FACE_ROLE_TEXT[role].label}「${faces[role]}」（${FACE_ROLE_TEXT[role].basis}）`,
    text: `${FACE_ROLE_TEXT[role].scene}${ANIMAL_FACE_TEXT[faces[role]][role === 'hyomen' ? 'surface' : 'decision']}`,
  })

  return [
    { heading: HEADING_FACES, items: [faceItem('hyomen', 'animal.surface'), faceItem('ishikettei', 'animal.decision')] },
    { heading: '基本性格', items: basic },
    {
      heading: '強み',
      items: [
        {
          key: 'shichu.strengths',
          system: 'shichu',
          source: `${stemSrc}・月柱の通変星「${chart.tsuhensei.monthBranch}」`,
          list: [...stem.strengths, work.strength],
        },
      ],
    },
    {
      heading: '弱み（注意点と活かし方）',
      items: [{ key: 'shichu.cautions', system: 'shichu', source: stemSrc, cautions: stem.cautions }],
    },
    {
      heading: '仕事スタイル',
      items: [
        { key: 'shichu.work', system: 'shichu', source: `月柱の通変星「${chart.tsuhensei.monthBranch}」`, text: work.style },
        { key: 'kyusei.work', system: 'kyusei', source: honmeiSrc, text: honmei.work },
      ],
    },
    {
      heading: '対人傾向',
      items: [
        { key: 'shichu.interpersonal', system: 'shichu', source: stemSrc, text: stem.interpersonal },
        { key: 'kyusei.interpersonal', system: 'kyusei', source: honmeiSrc, text: honmei.interpersonal },
        {
          key: 'kyusei.inner',
          system: 'kyusei',
          source: `月命星「${KYUSEI_NAMES[chart.kyusei.getsumei]}」（内面）`,
          text: `内面には「${getsumei.keyword}」の要素を持ちやすいとされます。親しくなるほど、この面が表に出ることが多いようです。`,
        },
      ],
    },
    {
      heading: '接し方のコツ',
      items: [
        { key: 'shichu.tips', system: 'shichu', source: stemSrc, list: stem.tips },
        { key: 'animal.tip', system: 'animal', source: `動物タイプ「${chart.animal}」`, text: animal.tip },
      ],
    },
    {
      heading: HEADING_ELEMENTS,
      items: [{ key: 'shichu.elements', system: 'shichu', source: '三柱の五行', list: elementLines }],
    },
  ]
}
