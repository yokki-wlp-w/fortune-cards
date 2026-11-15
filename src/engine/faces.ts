// 動物タイプの「3つの顔」。日干から各柱の地支に引いた十二運を、それぞれ12動物に置き換える。
//   本質     = 日柱の十二運
//   表面     = 月柱の十二運
//   意思決定 = 年柱の十二運
// 一般に「希望」は時柱（出生時刻が必要）、「隠れ」は算出方法が公開されていないため、ここでは扱わない。
import { animalOf } from './animal'
import type { ChartCore } from './chart'

export type FaceRole = 'honshitsu' | 'hyomen' | 'ishikettei'
export const FACE_ROLES: FaceRole[] = ['honshitsu', 'hyomen', 'ishikettei']

export function animalFaces(chart: Pick<ChartCore, 'juniun'>): Record<FaceRole, string> {
  return {
    honshitsu: animalOf(chart.juniun.day),
    hyomen: animalOf(chart.juniun.month),
    ishikettei: animalOf(chart.juniun.year),
  }
}
