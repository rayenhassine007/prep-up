import { describe, expect, it } from 'vitest';
import data from '../../src/data/rangs_2024_capacites_2025.json' with { type: 'json' };
import {
  MARGIN_SUR,
  bandTxt,
  compareProximite,
  computeSimRow,
  filteredSortedRows,
  shortInst,
  tierFor,
} from '../../src/lib/simulateur-logic.js';

const PROGRAMMES = (data.programmes || []).slice(0, 20).map((p) => ({
  inst: p.institution,
  spec: p.filiere,
  MP: p.MP,
  PC: p.PC,
  PT: p.PT,
  BG: p.BG,
  r2025: p.r2025 || null,
}));

describe('tierFor', () => {
  it('uses écart thresholds (200 / 0)', () => {
    expect(tierFor(100, 350)).toBe('sur');
    expect(tierFor(340, 350)).toBe('probable');
    expect(tierFor(360, 350)).toBe('impossible');
  });

  it('returns null when rmax is invalid', () => {
    expect(tierFor(100, null)).toBeNull();
    expect(tierFor(100, 0)).toBeNull();
  });

  it('respects custom margin sur', () => {
    expect(tierFor(50, 300, 100)).toBe('sur');
    expect(tierFor(250, 300, 100)).toBe('probable');
  });
});

describe('bandTxt', () => {
  it('formats single and range bands', () => {
    expect(bandTxt([355, 718])).toBe('355–718');
    expect(bandTxt([null, 500])).toBe('500');
    expect(bandTxt(null)).toBeNull();
  });
});

describe('compareProximite', () => {
  it('sorts positive margins ascending, then negative closest to zero', () => {
    const rows = [
      { inst: 'A', spec: 'x', margin: 5 },
      { inst: 'B', spec: 'x', margin: 0 },
      { inst: 'C', spec: 'x', margin: -10 },
      { inst: 'D', spec: 'x', margin: -1 },
    ];
    rows.sort(compareProximite);
    expect(rows.map((r) => r.margin)).toEqual([0, 5, -1, -10]);
  });
});

describe('filteredSortedRows', () => {
  it('returns only open programmes for track', () => {
    const rows = filteredSortedRows(PROGRAMMES, {
      track: 'MP',
      year: '2024',
      rank: 500,
      tierFilter: 'all',
      inst: 'all',
      sort: 'proximite',
      search: '',
    });
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => expect(r.open).toBe(true));
  });

  it('filters accessibles tier', () => {
    const rows = filteredSortedRows(PROGRAMMES, {
      track: 'MP',
      year: '2024',
      rank: 500,
      tierFilter: 'accessibles',
      inst: 'all',
      sort: 'proximite',
      search: '',
    });
    rows.forEach((r) => expect(['sur', 'probable']).toContain(r.tier));
  });
});

describe('computeSimRow', () => {
  it('computes margin from rmax and rank', () => {
    const p = PROGRAMMES.find((row) => row.MP?.capacite > 0);
    if (!p) return;
    const row = computeSimRow(p, 'MP', '2024', 500);
    if (row.rmax != null) {
      expect(row.margin).toBe(row.rmax - 500);
      expect(row.tier).toBe(tierFor(500, row.rmax));
    }
  });
});

describe('shortInst', () => {
  it('extracts acronym from parentheses suffix', () => {
    expect(shortInst('École Nationale d\'Ingénieurs de Tunis (ENIT)')).toBe('ENIT');
    expect(shortInst('ENIT')).toBe('ENIT');
  });
});

describe('MARGIN_SUR constant', () => {
  it('is 200', () => {
    expect(MARGIN_SUR).toBe(200);
  });
});
