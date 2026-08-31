import { describe, expect, it } from 'vitest';
import coefficients from '../../src/data/coefficients.json' with { type: 'json' };
import distribution2025 from '../../src/data/distribution_moyennes_2025.json' with { type: 'json' };
import rangsData from '../../src/data/rangs_2024_capacites_2025.json' with { type: 'json' };
import { estimateRankValue } from '../../src/lib/rank.js';
import { computeObjectif, moyenneForRank, schoolOptions } from '../../src/lib/objectif-logic.js';

describe('schoolOptions', () => {
  it('returns open programmes with resolved rank for MP', () => {
    const options = schoolOptions(rangsData.programmes, 'MP', '2025');
    expect(options.length).toBeGreaterThan(0);
    options.forEach((o) => {
      expect(o.rang).toBeTypeOf('number');
      expect(['2024', '2025']).toContain(o.srcYear);
    });
  });

  it('prefers 2025 rank when year is 2025', () => {
    const with2025 = schoolOptions(rangsData.programmes, 'MP', '2025');
    const first = with2025.find((o) => o.srcYear === '2025');
    expect(first).toBeDefined();
  });
});

describe('computeObjectif', () => {
  const { matieres, total } = coefficients.filieres.MP;

  it('returns no-target without rank', () => {
    expect(computeObjectif({
      filiere: 'MP',
      targetRank: null,
      notes: {},
      matieres,
      total,
      distribution: distribution2025,
    }).status).toBe('no-target');
  });

  it('computes needed notes for a reachable target', () => {
    const targetRank = 600;
    const result = computeObjectif({
      filiere: 'MP',
      targetRank,
      notes: {},
      matieres,
      total,
      distribution: distribution2025,
    });
    expect(['ok', 'already-there', 'unreachable']).toContain(result.status);
    if (result.status === 'ok') {
      expect(result.needed).toBeGreaterThan(0);
      expect(result.needed).toBeLessThanOrEqual(20);
    }
  });

  it('returns beyond-classes for impossible rank', () => {
    const classes = distribution2025.filieres.MP.classes;
    const result = computeObjectif({
      filiere: 'MP',
      targetRank: classes + 1,
      notes: {},
      matieres,
      total,
      distribution: distribution2025,
    });
    expect(result.status).toBe('beyond-classes');
  });
});

describe('moyenneForRank round-trip', () => {
  it('moyenne reaches target rank', () => {
    const target = 700;
    const moyenne = moyenneForRank(target, 'MP', distribution2025);
    if (moyenne == null) return;
    expect(estimateRankValue(moyenne, 'MP', distribution2025)).toBeLessThanOrEqual(target);
  });
});
