/**
 * 生成 /api/hello 路由 — SSR 模式验证用
 *
 * 接收 POST { message: string }，返回 { reply: string }（拼接 " world"）
 */
export function generateHelloRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const message = body.message ?? 'hello';

  return NextResponse.json({
    reply: \`\${message} world\`,
    timestamp: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    reply: 'hello world',
    message: 'SSR API is working! Send a POST request with { "message": "your text" } to test.',
    timestamp: new Date().toISOString(),
  });
}
`;
}
