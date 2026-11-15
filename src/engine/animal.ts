// 動物タイプ：日柱の十二運から12動物を決める（複数資料で対応を確認済み）。
// 60分類のキャラクター名・公式解説文は使わない。

export const ANIMAL_BY_JUNIUN: Record<string, string> = {
  胎: '狼',
  養: 'こじか',
  長生: '猿',
  沐浴: 'チータ',
  冠帯: '黒ひょう',
  建禄: 'ライオン',
  帝旺: '虎',
  衰: 'たぬき',
  病: '子守熊',
  死: 'ゾウ',
  墓: 'ひつじ',
  絶: 'ペガサス',
}

export function animalOf(dayJuniun: string): string {
  const a = ANIMAL_BY_JUNIUN[dayJuniun]
  if (!a) throw new Error(`未知の十二運: ${dayJuniun}`)
  return a
}
