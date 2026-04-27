import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

/** 判断 icon 路径是否为 .svg 文件 */
export function isSvgPath(value: string): boolean {
  return /\.svg$/i.test(value);
}

/**
 * 净化 SVG 字符串，移除潜在的危险内容。
 *
 * 安全策略（白名单方式）：
 * 1. 仅提取 <svg>...</svg> 根元素
 * 2. 移除 <script>、<style>、<foreignObject>、<use>、<animate> 等危险元素
 * 3. 移除 on* 事件属性
 * 4. 移除非锚点的 href/xlink:href（防止外部资源加载）
 * 5. 移除 javascript: 协议
 */
export function sanitizeSvg(raw: string): string {
  const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) return '';

  let svg = svgMatch[0];

  // 移除危险元素
  const dangerousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /<foreignObject[\s\S]*?<\/foreignObject>/gi,
    /<use[\s\S]*?<\/use>|<use[^>]*\/>/gi,
    /<animate[\s\S]*?<\/animate>|<animate[^>]*\/>/gi,
    /<set[\s\S]*?<\/set>|<set[^>]*\/>/gi,
  ];
  for (const re of dangerousPatterns) {
    svg = svg.replace(re, '');
  }

  // 移除事件属性
  svg = svg.replace(/\s+on[a-z]+\s*=\s*["'][^"']*["']/gi, '');

  // 移除非锚点的外部引用 href
  svg = svg.replace(/\s+(?:xlink:)?href\s*=\s*["'](?![#])[^"']*["']/gi, '');

  // 移除 javascript: 协议
  svg = svg.replace(/javascript:/gi, '');

  return svg.trim();
}

/**
 * 从用户项目的 public 目录读取 SVG 文件并净化。
 *
 * @param projectDir - 用户项目根目录（如 docs/）
 * @param iconPath - 图标路径（如 /icons/github-fill.svg）
 * @returns 净化后的 SVG 字符串，文件不存在或无效时返回 null
 */
export async function readAndSanitizeSvg(
  projectDir: string,
  iconPath: string
): Promise<string | null> {
  const fsPath = join(projectDir, 'public', iconPath.replace(/^\//, ''));

  let raw: string;
  try {
    raw = await readFile(fsPath, 'utf-8');
  } catch {
    return null;
  }

  const sanitized = sanitizeSvg(raw);
  return sanitized || null;
}
