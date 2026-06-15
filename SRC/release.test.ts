import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('release invariants', () => {
  it('ships restrictive Azure security headers', () => {
    const config = JSON.parse(readFileSync('staticwebapp.config.json', 'utf8'));
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
  });

  it('does not include AI or runtime CDN dependencies', () => {
    const files = ['package.json', 'api/package.json', 'index.html', 'vite.config.ts'];
    const content = files.map(file => readFileSync(file, 'utf8')).join('\n');
    expect(content).not.toMatch(/gemini|generative-ai|aistudiocdn|cdn\.tailwindcss/i);
  });
});
