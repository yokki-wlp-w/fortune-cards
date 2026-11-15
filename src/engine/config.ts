// 相性スコアの重みを1か所にまとめる。数値を変えるだけで配点を調整できる。

/**
 * 占術ごとの重み。合計が1でなくてもよい（重み0の占術はスコアに入らない）。
 * 数秘術をスコアに組み込むときは numerology を 0 より大きくし、compat.ts に因子を追加する。
 * 動物タイプは四柱推命の日柱から導かれるため、二重計上を避けて 0 のままにする。
 */
export const SYSTEM_WEIGHTS = {
  shichu: 0.6,
  kyusei: 0.4,
  numerology: 0,
  animal: 0,
} as const

/** 各占術の素点の基準値と範囲 */
export const BASE_SCORE = 60
export const MIN_SCORE = 20
export const MAX_SCORE = 98

/** 地支の関係を見るときの柱ごとの重み */
export const POSITION_WEIGHTS = { day: 1, month: 0.6, year: 0.4 } as const

/** 因子ごとの加減点（仕事 / プライベート） */
export const FACTOR_POINTS: Record<string, { work: number; private: number }> = {
  // 四柱推命：日干どうし
  'stem.same': { work: 6, private: 8 },
  'stem.gen': { work: 9, private: 10 },
  'stem.ctrl': { work: -3, private: -9 },
  'stem.kango': { work: 8, private: 16 },
  // 四柱推命：地支どうし（柱の重みを掛ける）
  'branch.same': { work: 4, private: 5 },
  'branch.rikugo': { work: 7, private: 11 },
  'branch.sango': { work: 9, private: 6 },
  'branch.chu': { work: -7, private: -11 },
  'branch.kei': { work: -6, private: -6 },
  'branch.gai': { work: -4, private: -8 },
  // 四柱推命：五行の補完（1件あたり。最大2件）
  'element.complement': { work: 6, private: 4 },
  // 九星気学：本命星どうし
  'kyusei.same': { work: 8, private: 10 },
  'kyusei.gen': { work: 16, private: 16 },
  'kyusei.ctrl': { work: -14, private: -14 },
}

/** 五行バランスで「不足」「十分」とみなす境目（合計6のうち） */
export const ELEMENT_LACK = 0.5
export const ELEMENT_RICH = 1.6
