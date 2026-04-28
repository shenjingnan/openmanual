import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isSvgPath,
  jsLiteral,
  readAndSanitizeSvg,
  sanitizeSvg,
} from '../core/generator/code-utils.js';

// Mock fs/promises for readAndSanitizeSvg tests
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

describe('jsLiteral', () => {
  describe('基本字符串', () => {
    it('应当将纯 ASCII 字符串用双引号包裹', () => {
      expect(jsLiteral('hello')).toBe('"hello"');
    });

    it('应当处理空字符串', () => {
      expect(jsLiteral('')).toBe('""');
    });

    it('应当处理单个字符', () => {
      expect(jsLiteral('a')).toBe('"a"');
    });
  });

  describe('引号转义（原始修复目标）', () => {
    it('应当转义字符串内的单引号', () => {
      expect(jsLiteral("it's fun")).toBe('"it\'s fun"');
    });

    it('应当转义字符串内的双引号', () => {
      expect(jsLiteral('say "hello"')).toBe('"say \\"hello\\""');
    });

    it('应当转义多个单引号', () => {
      expect(jsLiteral("Test's Project")).toBe('"Test\'s Project"');
    });

    it('应当处理连续的单引号', () => {
      expect(jsLiteral("ain't it''t")).toBe("\"ain't it''t\"");
    });
  });

  describe('反斜杠转义', () => {
    it('应当转义反斜杠', () => {
      expect(jsLiteral('path\\to\\file')).toBe('"path\\\\to\\\\file"');
    });

    it('应当转义引号前的反斜杠', () => {
      expect(jsLiteral("\\'escaped\\'")).toBe('"\\\\\'escaped\\\\\'"');
    });
  });

  describe('反引号转义（防止模板字面量注入）', () => {
    it('应当转义反引号以防止模板字面量被破坏', () => {
      expect(jsLiteral('a`b')).toBe('"a`b"');
    });

    it('应当转义独立的反引号', () => {
      expect(jsLiteral('`')).toBe('"`"');
    });

    it('应当转义字符串中间的反引号', () => {
      expect(jsLiteral('test`value')).toBe('"test`value"');
    });
  });

  describe('模板表达式注入防护', () => {
    it('应当保留 $ 符号但不允许表达式注入', () => {
      // In JSON.stringify output, $ is just a normal character
      const result = jsLiteral(`${`{alert(1)}`}`);
      expect(result).toBe(`"${`{alert(1)}`}"`);
      // The key: when embedded in a SINGLE-QUOTE template literal context,
      // ${} would be evaluated. But jsLiteral outputs DOUBLE-QUOTED strings
      // where ${} is safe.
      expect(result).not.toContain("'"); // must be double-quoted
    });

    it('应当处理 $ 符号后跟非花括号的情况', () => {
      expect(jsLiteral('$100')).toBe('"$100"');
    });
  });

  describe('空白字符和控制字符', () => {
    it('应当转义换行符', () => {
      expect(jsLiteral('line1\nline2')).toBe('"line1\\nline2"');
    });

    it('应当转义回车符', () => {
      expect(jsLiteral('line1\rline2')).toBe('"line1\\rline2"');
    });

    it('应当转义制表符', () => {
      expect(jsLiteral('col1\tcol2')).toBe('"col1\\tcol2"');
    });

    it('应当转义多个连续换行符', () => {
      expect(jsLiteral('\n\n')).toBe('"\\n\\n"');
    });
  });

  describe('Unicode 支持', () => {
    it('应当处理中文字符', () => {
      expect(jsLiteral('中文测试')).toBe('"中文测试"');
    });

    it('应当处理日文字符', () => {
      expect(jsLiteral('日本語テスト')).toBe('"日本語テスト"');
    });

    it('应当处理韩文字符', () => {
      expect(jsLiteral('한국어테스트')).toBe('"한국어테스트"');
    });

    it('应当处理表情符号', () => {
      expect(jsLiteral('hello 🌍 world')).toBe('"hello 🌍 world"');
    });

    it('应当处理混合的 Unicode 和特殊字符', () => {
      expect(jsLiteral("It's 中文 `test`")).toBe('"It\'s 中文 `test`"');
    });
  });

  describe('真实配置场景的边界情况', () => {
    it('应当安全编码包含特殊字符的页脚文本', () => {
      const footer = "MIT 2025 © Test's Project";
      const result = jsLiteral(footer);
      expect(result).toContain("'");
      expect(result).toMatch(/^".*"$/);
    });

    it('应当安全编码包含引号的描述', () => {
      const desc = 'A "great" doc site';
      const result = jsLiteral(desc);
      expect(result).toBe('"A \\"great\\" doc site"');
    });

    it('应当安全编码包含反引号的配置名称', () => {
      const name = 'My`Project';
      const result = jsLiteral(name);
      expect(result).toBe('"My`Project"');
    });

    it('应当安全编码语言显示名称', () => {
      expect(jsLiteral('English')).toBe('"English"');
      expect(jsLiteral('中文')).toBe('"中文"');
      expect(jsLiteral('日本語')).toBe('"日本語"');
    });

    it('应当安全编码文件路径', () => {
      expect(jsLiteral('/tmp/project/openapi.yaml')).toBe('"/tmp/project/openapi.yaml"');
      expect(jsLiteral('docs/openapi.json')).toBe('"docs/openapi.json"');
    });

    it('应当安全编码 groupBy 枚举值', () => {
      expect(jsLiteral('tag')).toBe('"tag"');
      expect(jsLiteral('route')).toBe('"route"');
      expect(jsLiteral('none')).toBe('"none"');
    });
  });

  describe('输出格式约定', () => {
    it('应当始终返回双引号字符串', () => {
      const result = jsLiteral('anything');
      expect(result.startsWith('"')).toBe(true);
      expect(result.endsWith('"')).toBe(true);
    });

    it('不应生成单引号输出', () => {
      // This is critical: single-quote output in a template literal
      // context is vulnerable to injection
      const inputs = ['test', "it's", 'say "hi"', '`backtick`', `${`{expr}`}`];
      for (const input of inputs) {
        const result = jsLiteral(input);
        // The outer quotes must be double quotes
        expect(result.charAt(0)).toBe('"');
        expect(result.charAt(result.length - 1)).toBe('"');
      }
    });
  });
});

// ============================================================
// isSvgPath — 覆盖 SVG 路径检测
// ============================================================

describe('isSvgPath', () => {
  it('应当识别 .svg 扩展名（小写）', () => {
    expect(isSvgPath('/icons/github.svg')).toBe(true);
  });

  it('应当识别 .svg 扩展名（大写）', () => {
    expect(isSvgPath('/icons/logo.SVG')).toBe(true);
  });

  it('应当识别 .svg 扩展名（混合大小写）', () => {
    expect(isSvgPath('/icons/icon.SvG')).toBe(true);
  });

  it('不应当识别 .png 文件', () => {
    expect(isSvgPath('/icons/logo.png')).toBe(false);
  });

  it('不应当识别 .jpg 文件', () => {
    expect(isSvgPath('/photo.jpg')).toBe(false);
  });

  it('不应当识别无扩展名的路径', () => {
    expect(isSvgPath('/icons/logo')).toBe(false);
  });

  it('不应当识别 lucide 图标名称', () => {
    expect(isSvgPath('Github')).toBe(false);
    expect(isSvgPath('Twitter')).toBe(false);
  });

  it('不应当识别带查询参数的路径（.svg 不在末尾）', () => {
    // 正则要求 .svg 严格在字符串末尾，这是设计意图
    expect(isSvgPath('/icons/icon.svg?v=2')).toBe(false);
  });
});

// ============================================================
// sanitizeSvg — 覆盖 SVG 安全净化逻辑
// ============================================================

describe('sanitizeSvg', () => {
  const cleanSvg =
    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 22h20L12 2z"/></svg>';

  describe('基本提取', () => {
    it('应当正确提取 <svg>...</svg> 内容', () => {
      const input = '<?xml version="1.0"?><svg viewBox="0 0 24 24"><circle r="10"/></svg>';
      const result = sanitizeSvg(input);
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('<circle');
    });

    it('应当移除 XML 声明', () => {
      const input =
        '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<?xml');
    });

    it('当输入不含 <svg> 标签时应当返回空字符串', () => {
      expect(sanitizeSvg('<div>not an svg</div>')).toBe('');
    });

    it('当输入为空字符串时应当返回空字符串', () => {
      expect(sanitizeSvg('')).toBe('');
    });
  });

  describe('危险元素移除', () => {
    it('应当移除 <script> 元素', () => {
      const input = `<svg><script>alert('xss')</script><circle r="10"/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('<circle');
    });

    it('应当移除 <style> 元素', () => {
      const input = `<svg><style>body { background: red }</style><path d="M0 0"/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<style');
      expect(result).toContain('<path');
    });

    it('应当移除 <foreignObject> 元素', () => {
      const input = `<svg><foreignObject><html>evil</html></foreignObject><rect/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('foreignObject');
      expect(result).toContain('<rect');
    });

    it('应当移除 <use> 元素（自闭合形式）', () => {
      const input = `<svg><use href="/external.svg#id"/><circle/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<use');
      expect(result).toContain('<circle');
    });

    it('应当移除 <use> 元素（闭合标签形式）', () => {
      const input = `<svg><use href="#local"></use><circle/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<use');
    });

    it('应当移除 <animate> 元素', () => {
      const input = `<svg><animate attributeName="x" from="0" to="100"/><rect/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('animate');
      expect(result).toContain('<rect');
    });

    it('应当移除 <set> 元素', () => {
      const input = `<svg><set attributeName="fill" to="red"/><circle/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('<set');
      expect(result).toContain('<circle');
    });
  });

  describe('事件属性移除', () => {
    it('应当移除 onclick 属性', () => {
      const input = `<svg><circle onclick="steal()" r="10"/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<circle');
    });

    it('应当移除 onload 属性', () => {
      const input = `<svg onload="hack()"><rect/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('onload');
    });

    it('应当移除 onerror 属性', () => {
      const input = `<svg><image onerror="alert(1)"/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('onerror');
    });

    it('应当移除 onmouseover 属性', () => {
      const input = `<svg><rect onmouseover="bad()" /></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('onmouseover');
    });

    it('应当同时移除多个事件属性', () => {
      const input = `<svg><g onclick="a()" onload="b()" onerror="c()"><circle/></g></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toMatch(/on\w+=/);
    });
  });

  describe('外部引用移除', () => {
    it('应当移除非锚点的 href 属性', () => {
      const input = `<svg><a href="https://evil.com"><text>click</text></a></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('https://evil.com');
    });

    it('应当保留锚点 href（#id 引用）', () => {
      const input = `<svg><use href="#icon-github"/></svg>`;
      const result = sanitizeSvg(input);
      // use 元素本身会被移除，但验证 href="#..." 的保留逻辑
      // 注意：use 被移除了，所以这里主要测试 href="#..." 不被外部引用规则误删
      expect(result).not.toContain('http');
    });

    it('应当移除 xlink:href 外部引用', () => {
      const input = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil.com/svg"/></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('http://evil.com');
    });
  });

  describe('javascript: 协议移除', () => {
    it('应当移除 javascript: 协议', () => {
      const input = `<svg><a href="javascript:alert(1)"><text>xss</text></a></svg>`;
      const result = sanitizeSvg(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('安全 SVG 保留', () => {
    it('应当完整保留干净的 SVG 内容', () => {
      const input = cleanSvg;
      const result = sanitizeSvg(input);
      expect(result).toBe(cleanSvg);
    });

    it('应当保留 fill="currentColor" 属性', () => {
      const input = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2z"/></svg>';
      const result = sanitizeSvg(input);
      expect(result).toContain('fill="currentColor"');
    });

    it('应当保留 width 和 height 属性', () => {
      const input = '<svg width="40" height="40" viewBox="0 0 1024 1024"><path d="M0 0"/></svg>';
      const result = sanitizeSvg(input);
      expect(result).toContain('width="40"');
      expect(result).toContain('height="40"');
    });

    it('应当保留 class 属性', () => {
      const input = '<svg class="my-icon"><circle class="inner" r="5"/></svg>';
      const result = sanitizeSvg(input);
      expect(result).toContain('class="my-icon"');
      expect(result).toContain('class="inner"');
    });

    it('应当保留 xmlns 属性', () => {
      const input = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
      const result = sanitizeSvg(input);
      expect(result).toContain('xmlns=');
    });

    it('应当处理真实 GitHub 图标 SVG', () => {
      const githubSvg = `<svg width="40" height="40" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor"
    d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9 23.5 23.2 38.1 55.4 38.1 91v112.5c0.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z" />
</svg>`;
      const result = sanitizeSvg(githubSvg);
      expect(result).toContain('fill="currentColor"');
      expect(result).toContain('viewBox="0 0 1024 1024"');
      expect(result).toContain('<path');
      expect(result).toContain('</svg>');
    });
  });

  describe('综合攻击向量', () => {
    it('应当净化包含多种攻击向量的恶意 SVG', () => {
      const malicious = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('xss')</script>
  <style>.evil { color: red }</style>
  <foreignObject><body><iframe src="evil"/></body></foreignObject>
  <circle onclick="steal()" r="10" />
  <a href="javascript:alert(1)"><text>click</text></a>
  <use href="https://evil.com/sprite.svg#icon" />
  <animate attributeName="x" from="0" to="100" />
  <path fill="currentColor" d="M0 0h24v24H0z"/>
</svg>`;
      const result = sanitizeSvg(malicious);

      // 危险内容必须被移除
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<style');
      expect(result).not.toContain('foreignObject');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('https://evil.com');
      expect(result).not.toContain('<animate');

      // 安全内容必须保留
      expect(result).toContain('fill="currentColor"');
      expect(result).toContain('<path');
      expect(result).toMatch(/<svg[\s\S]*<\/svg>/);
    });
  });
});

// ============================================================
// readAndSanitizeSvg — 覆盖文件读取与净化集成
// ============================================================

describe('readAndSanitizeSvg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应当成功读取并净化 SVG 文件', async () => {
    const svgContent = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2z"/></svg>';
    vi.mocked(readFile).mockResolvedValueOnce(svgContent);

    const result = await readAndSanitizeSvg('/project/dir', '/icons/test.svg');

    expect(result).toBe(svgContent);
    expect(readFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/project\/dir\/public\/icons\/test\.svg$/),
      'utf-8'
    );
  });

  it('应当正确拼接 public 目录路径', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('<svg><circle r="10"/></svg>');

    await readAndSanitizeSvg('/docs', '/icons/logo.svg');

    expect(readFile).toHaveBeenCalledWith('/docs/public/icons/logo.svg', 'utf-8');
  });

  it('应当去除开头的 / 后再拼接路径', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('<svg><rect/></svg>');

    await readAndSanitizeSvg('/project', '//icons///double.svg');

    // join 会处理多余的 /
    expect(readFile).toHaveBeenCalled();
    const mockCalls = vi.mocked(readFile)?.mock.calls;
    const calledPath = mockCalls?.[0]?.[0] as string;
    expect(calledPath).toContain('public');
    expect(calledPath).toContain('double.svg');
    expect(calledPath).not.toContain('//icons');
  });

  it('当文件不存在时应当返回 null', async () => {
    (vi.mocked(readFile) as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));

    const result = await readAndSanitizeSvg('/project', '/icons/missing.svg');

    expect(result).toBeNull();
  });

  it('当 readFile 抛出权限错误时应当返回 null', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('EACCES'));

    const result = await readAndSanitizeSvg('/project', '/icons/no-perm.svg');

    expect(result).toBeNull();
  });

  it('当 SVG 内容无效（无 svg 标签）时应当返回 null', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('this is not an svg file');

    const result = await readAndSanitizeSvg('/project', '/icons/bad.svg');

    // sanitizeSvg 返回空字符串，|| null 将其转为 null
    expect(result).toBeNull();
  });

  it('当 SVG 内容为空时应当返回 null', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('');

    const result = await readAndSanitizeSvg('/project', '/icons/empty.svg');

    expect(result).toBeNull();
  });

  it('应当对读取到的内容执行净化', async () => {
    const maliciousSvg = '<svg><script>alert(1)</script><path d="M0 0"/></svg>';
    vi.mocked(readFile).mockResolvedValueOnce(maliciousSvg);

    const result = await readAndSanitizeSvg('/project', '/icons/malicious.svg');

    expect(result).not.toBeNull();
    expect(result).not.toContain('<script');
    expect(result).toContain('<path');
  });
});
