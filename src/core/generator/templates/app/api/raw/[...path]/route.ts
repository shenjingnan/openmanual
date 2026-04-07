import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const slug = segments.join('/');
  for (const ext of ['.mdx', '.md']) {
    try {
      const filePath = join(process.cwd(), 'content', `${slug}${ext}`);
      const content = await readFile(filePath, 'utf-8');
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch {
      /* try next extension */
    }
  }
  return new NextResponse('Not found', { status: 404 });
}
