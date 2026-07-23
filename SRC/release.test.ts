import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sortRoutinesByRecency } from './utils/routineReview';
import { Routine } from './types';

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

  it('ships the shared sheet catalog migration', () => {
    const migration = readFileSync('migrations/002_shared_sheet_catalog.sql', 'utf8');
    expect(migration).toContain('CREATE TABLE dbo.SheetCatalog');
    expect(migration).toContain('classification');
    expect(migration).toContain('global_order');
    expect(migration).toContain('FK_OutputSheets_SheetCatalog');
  });

  it('ships the routine peer-review migration', () => {
    const migration = readFileSync('migrations/003_routine_peer_review.sql', 'utf8');
    expect(migration).toContain('review_status');
    expect(migration).toContain('last_changed_by_user_id');
    expect(migration).toContain('reviewed_by_user_id');
    expect(migration).toContain("DEFAULT ('Reviewed')");
  });

  it('orders routines by most recent edit with a stable tie-breaker', () => {
    const base: Omit<Routine, 'id' | 'routine_name' | 'last_edited_date'> = {
      routine_display_name: '', version: 'v1', routine_group: '', routine_type: '',
      fund_types: [], capital_structure: '', region: [], helper_routines: [], review_status: 'Reviewed'
    };
    const routines: Routine[] = [
      { ...base, id: 'b', routine_name: 'Beta', last_edited_date: '2026-01-01T12:00:00Z' },
      { ...base, id: 'a', routine_name: 'Alpha', last_edited_date: '2026-01-01T12:00:00Z' },
      { ...base, id: 'c', routine_name: 'Current', last_edited_date: '2026-01-02T12:00:00Z' }
    ];

    expect(sortRoutinesByRecency(routines).map(routine => routine.id)).toEqual(['c', 'a', 'b']);
  });
});
