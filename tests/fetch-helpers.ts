import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';

export const publicFile = (path: string) => readFileSync(resolve(__dirname, '../public', path), 'utf8');

/** Serve the bundled public/data files to the app's fetch calls. */
export function serveBundledData() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = url.replace(/^.*?data\//, 'data/');
      return Promise.resolve(new Response(publicFile(path), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }),
  );
}
