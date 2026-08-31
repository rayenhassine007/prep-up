import { describe, expect, it } from 'vitest';
import {
  computeAnnual,
  computeSemester,
  effectiveMoy,
  moyFromComponents,
  PONDERATION,
} from '../../src/lib/annee1-logic.js';

describe('moyFromComponents', () => {
  it('computes sans TP weighted average', () => {
    const row = { avecTP: false, tests: 12, ds: 14, exam: 16 };
    const { moy, partial } = moyFromComponents(row);
    expect(partial).toBe(false);
    expect(moy).toBeCloseTo(12 * 0.15 + 14 * 0.35 + 16 * 0.50, 5);
  });

  it('renormalizes partial components', () => {
    const row = { avecTP: false, tests: 10, ds: null, exam: 20 };
    const { moy, partial } = moyFromComponents(row);
    expect(partial).toBe(true);
    expect(moy).toBeCloseTo((10 * 0.15 + 20 * 0.5) / (0.15 + 0.5), 5);
  });

  it('uses TP weights when avecTP is true', () => {
    expect(PONDERATION.avecTP).toHaveLength(4);
    expect(PONDERATION.sansTP).toHaveLength(3);
  });
});

describe('effectiveMoy', () => {
  it('uses direct moy when not in detail mode', () => {
    expect(effectiveMoy({ detail: false, moy: 14.5 })).toBe(14.5);
  });
});

describe('computeSemester', () => {
  const matieres = [
    { nom: 'Maths', coef: 4, note: 'Maths' },
    { nom: 'Physique', coef: 3, note: 'Physique' },
  ];
  const rows = {};

  function getRow(m) {
    if (!rows[m.nom]) rows[m.nom] = { coef: m.coef, avecTP: false, detail: false, moy: null };
    return rows[m.nom];
  }

  it('computes semester average from filled matières', () => {
    getRow(matieres[0]).moy = 16;
    getRow(matieres[1]).moy = 12;
    const result = computeSemester(matieres, getRow, null);
    expect(result.moyenne).toBeCloseTo((16 * 4 + 12 * 3) / 7, 5);
    expect(result.verdict).toBe('none');
  });

  it('computes needed note for target', () => {
    getRow(matieres[0]).moy = 14;
    getRow(matieres[1]).moy = null;
    const result = computeSemester(matieres, getRow, 15);
    expect(result.verdict).toBe('need');
    expect(result.needed).toBeGreaterThan(0);
    expect(result.needed).toBeLessThanOrEqual(20);
  });

  it('flags impossible target', () => {
    getRow(matieres[0]).moy = 10;
    getRow(matieres[1]).moy = null;
    const result = computeSemester(matieres, getRow, 19);
    expect(result.verdict).toBe('impossible');
  });
});

describe('computeAnnual', () => {
  it('applies (2×S1 + 3×S2) / 5 formula', () => {
    expect(computeAnnual(12, 14)).toBeCloseTo((2 * 12 + 3 * 14) / 5, 5);
    expect(computeAnnual(null, 14)).toBeNull();
  });
});
