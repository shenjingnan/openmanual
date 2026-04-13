/**
 * 生成 SSR 测试按钮组件 — 客户端组件
 *
 * 在文档页面右下角显示一个悬浮按钮，点击后调用 /api/hello 验证 SSR API 可用性
 */
export function generateSsrTestButton(): string {
  return `'use client';

import { useState } from 'react';

export function SsrTestButton() {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/hello', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(\`Error: \${err instanceof Error ? err.message : String(err)}\`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
    }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: loading ? '#999' : '#2B7A4B',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {loading ? '请求中...' : '测试 SSR API'}
      </button>
      {response && (
        <pre style={{
          background: '#1a1a2e',
          color: '#0f0',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          maxWidth: 360,
          maxHeight: 200,
          overflow: 'auto',
          margin: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {response}
        </pre>
      )}
    </div>
  );
}
`;
}
