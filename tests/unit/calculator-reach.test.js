import { describe, expect, it } from 'vitest';
import {
  buildReachRows,
  computeTier,
  filterSortReachRows,
} from '../../src/lib/calculator-reach.js';

describe('computeTier', () => {
  it('classifies rank vs seuil with 80% margin rule', () => {
    expect(computeTier(400, 500)).toBe('probable');
    expect(computeTier(450, 500)).toBe('incertain');
    expect(computeTier(600, 500)).toBe('impossible');
  });

  it('returns null for non-numeric seuil', () => {
    expect(computeTier(100, null)).toBeNull();
  });
});

describe('buildReachRows and filterSortReachRows', () => {
  const programmes = [
    { institution: 'ENIT', filiere: 'Génie Civil', capacite: 10, rang: 500 },
    { institution: 'EPT', filiere: 'Informatique', capacite: 20, rang: 200 },
    { institution: 'ENIS', filiere: 'Mécanique', capacite: 5, rang: 800 },
  ];

  it('builds tiered rows and sorts by tier then seuil', () => {
    const rows = buildReachRows(programmes, 350);
    expect(rows).toHaveLength(3);
    const sorted = filterSortReachRows(rows);
    expect(sorted[0].tier).toBe('probable');
    expect(sorted[0].seuil).toBeLessThanOrEqual(sorted[1].seuil);
  });

  it('filters by institution search term', () => {
    const rows = buildReachRows(programmes, 350);
    const filtered = filterSortReachRows(rows, 'enit');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].inst).toBe('ENIT');
  });
});
