import { describe, expect, it } from 'vitest';
import { jsLiteral } from '../core/generator/code-utils.js';

describe('jsLiteral', () => {
  describe('basic strings', () => {
    it('should wrap plain ASCII string in double quotes', () => {
      expect(jsLiteral('hello')).toBe('"hello"');
    });

    it('should handle empty string', () => {
      expect(jsLiteral('')).toBe('""');
    });

    it('should handle single character', () => {
      expect(jsLiteral('a')).toBe('"a"');
    });
  });

  describe('quote escaping (original fix target)', () => {
    it('should escape single quotes inside the string', () => {
      expect(jsLiteral("it's fun")).toBe('"it\'s fun"');
    });

    it('should escape double quotes inside the string', () => {
      expect(jsLiteral('say "hello"')).toBe('"say \\"hello\\""');
    });

    it('should escape multiple single quotes', () => {
      expect(jsLiteral("Test's Project")).toBe('"Test\'s Project"');
    });

    it('should handle consecutive single quotes', () => {
      expect(jsLiteral("ain't it''t")).toBe("\"ain't it''t\"");
    });
  });

  describe('backslash escaping', () => {
    it('should escape backslashes', () => {
      expect(jsLiteral('path\\to\\file')).toBe('"path\\\\to\\\\file"');
    });

    it('should escape backslash before quote', () => {
      expect(jsLiteral("\\'escaped\\'")).toBe('"\\\\\'escaped\\\\\'"');
    });
  });

  describe('backtick escaping (template literal injection prevention)', () => {
    it('should escape backticks to prevent template literal breakage', () => {
      expect(jsLiteral('a`b')).toBe('"a`b"');
    });

    it('should escape standalone backtick', () => {
      expect(jsLiteral('`')).toBe('"`"');
    });

    it('should escape backtick in middle of string', () => {
      expect(jsLiteral('test`value')).toBe('"test`value"');
    });
  });

  describe('template expression injection prevention', () => {
    it('should preserve $ sign without allowing expression injection', () => {
      // In JSON.stringify output, $ is just a normal character
      const result = jsLiteral('${alert(1)}');
      expect(result).toBe('"${alert(1)}"');
      // The key: when embedded in a SINGLE-QUOTE template literal context,
      // ${} would be evaluated. But jsLiteral outputs DOUBLE-QUOTED strings
      // where ${} is safe.
      expect(result).not.toContain("'"); // must be double-quoted
    });

    it('should handle dollar sign followed by non-brace', () => {
      expect(jsLiteral('$100')).toBe('"$100"');
    });
  });

  describe('whitespace and control characters', () => {
    it('should escape newlines', () => {
      expect(jsLiteral('line1\nline2')).toBe('"line1\\nline2"');
    });

    it('should escape carriage returns', () => {
      expect(jsLiteral('line1\rline2')).toBe('"line1\\rline2"');
    });

    it('should escape tabs', () => {
      expect(jsLiteral('col1\tcol2')).toBe('"col1\\tcol2"');
    });

    it('should escape multiple consecutive newlines', () => {
      expect(jsLiteral('\n\n')).toBe('"\\n\\n"');
    });
  });

  describe('unicode support', () => {
    it('should handle Chinese characters', () => {
      expect(jsLiteral('中文测试')).toBe('"中文测试"');
    });

    it('should handle Japanese characters', () => {
      expect(jsLiteral('日本語テスト')).toBe('"日本語テスト"');
    });

    it('should handle Korean characters', () => {
      expect(jsLiteral('한국어테스트')).toBe('"한국어테스트"');
    });

    it('should handle emoji', () => {
      expect(jsLiteral('hello 🌍 world')).toBe('"hello 🌍 world"');
    });

    it('should handle mixed unicode and special chars', () => {
      expect(jsLiteral("It's 中文 `test`")).toBe('"It\'s 中文 `test`"');
    });
  });

  describe('edge cases from real config scenarios', () => {
    it('should safely encode footer text with special chars', () => {
      const footer = "MIT 2025 © Test's Project";
      const result = jsLiteral(footer);
      expect(result).toContain("'");
      expect(result).toMatch(/^".*"$/);
    });

    it('should safely encode description with quotes', () => {
      const desc = 'A "great" doc site';
      const result = jsLiteral(desc);
      expect(result).toBe('"A \\"great\\" doc site"');
    });

    it('should safely encode config name with backtick', () => {
      const name = 'My`Project';
      const result = jsLiteral(name);
      expect(result).toBe('"My`Project"');
    });

    it('should safely encode language display name', () => {
      expect(jsLiteral('English')).toBe('"English"');
      expect(jsLiteral('中文')).toBe('"中文"');
      expect(jsLiteral('日本語')).toBe('"日本語"');
    });

    it('should safely encode file paths', () => {
      expect(jsLiteral('/tmp/project/openapi.yaml')).toBe('"/tmp/project/openapi.yaml"');
      expect(jsLiteral('docs/openapi.json')).toBe('"docs/openapi.json"');
    });

    it('should safely encode groupBy enum values', () => {
      expect(jsLiteral('tag')).toBe('"tag"');
      expect(jsLiteral('route')).toBe('"route"');
      expect(jsLiteral('none')).toBe('"none"');
    });
  });

  describe('output format contract', () => {
    it('should always return double-quoted string', () => {
      const result = jsLiteral('anything');
      expect(result.startsWith('"')).toBe(true);
      expect(result.endsWith('"')).toBe(true);
    });

    it('should never produce single-quoted output', () => {
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
