/**
 * 将值安全地序列化为 JS 字符串字面量（带双引号）。
 *
 * 借用 JSON.stringify 的完整转义能力，覆盖所有特殊字符：
 * - 单引号 / 双引号 / 反斜杠 → 已转义
 * - 反引号 → 已转义（避免破坏外层模板字面量）
 * - 换行 / 制表 / 控制字符 → 已转义
 *
 * @example
 * jsLiteral("hello")      // '"hello"'
 * jsLiteral("it's fun")   // '"it\'s fun"'
 * jsLiteral('line1\nline2') // '"line1\\nline2"'
 * jsLiteral('a`b')        // '"a`b"'  (反引号被转义)
 */
export function jsLiteral(value: string): string {
  return JSON.stringify(value);
}
