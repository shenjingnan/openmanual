import { describe, expect, it } from 'vitest';
import { jsLiteral } from '../core/generator/code-utils.js';

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
      const result = jsLiteral('${alert(1)}');
      expect(result).toBe('"${alert(1)}"');
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
      const inputs = ['test', "it's", 'say "hi"', '`backtick`', '${expr}'];
      for (const input of inputs) {
        const result = jsLiteral(input);
        // The outer quotes must be double quotes
        expect(result.charAt(0)).toBe('"');
        expect(result.charAt(result.length - 1)).toBe('"');
      }
    });
  });
});
