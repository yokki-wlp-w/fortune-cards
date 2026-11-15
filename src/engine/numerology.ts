// 数秘術：生年月日の各桁を合計してライフパスナンバーを出す。11・22・33 はマスターナンバーとして残す。

const MASTER = [11, 22, 33]
const digitSum = (n: number): number =>
  String(n)
    .split('')
    .reduce((a, c) => a + Number(c), 0)

export function lifePathNumber(y: number, m: number, d: number): number {
  let n = digitSum(y) + digitSum(m) + digitSum(d)
  while (n > 9 && !MASTER.includes(n)) n = digitSum(n)
  return n
}
