import { describe, expect, it } from 'vitest';
import distribution2025 from '../../src/data/distribution_moyennes_2025.json' with { type: 'json' };
import coefficients from '../../src/data/coefficients.json' with { type: 'json' };
import {
  computeScore,
  estimateRank,
  estimateRankValue,
  moyenneForRank,
  round2,
  smallestNoteReaching,
} from '../../src/lib/rank.js';

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(12.345)).toBe(12.35);
    expect(round2(12.344)).toBe(12.34);
  });
});

describe('estimateRank', () => {
  it('returns rank bounded by classes for MP 2025', () => {
    const result = estimateRank(14, 'MP', distribution2025);
    expect(result).not.toBeNull();
    expect(result.rank).toBeGreaterThanOrEqual(1);
    expect(result.rank).toBeLessThanOrEqual(result.classes);
    expect(result.stats.moyenne).toBeTypeOf('number');
  });

  it('returns null for unknown filière', () => {
    expect(estimateRank(12, 'UNKNOWN', distribution2025)).toBeNull();
  });

  it('improves rank as moyenne increases', () => {
    const low = estimateRankValue(8, 'MP', distribution2025);
    const high = estimateRankValue(16, 'MP', distribution2025);
    expect(high).toBeLessThan(low);
  });
});

describe('computeScore', () => {
  it('sums notes with coefficients and optional bonus', () => {
    const { matieres, total } = coefficients.filieres.MP;
    const notes = {};
    for (const [nom, coef] of Object.entries(matieres)) notes[nom] = 10;

    const withoutBonus = computeScore(notes, matieres, total, false);
    expect(withoutBonus.hasAnyNote).toBe(true);
    expect(withoutBonus.score).toBe(total * 10);
    expect(withoutBonus.moyenne).toBe(10);

    const withBonus = computeScore(notes, matieres, total, true);
    expect(withBonus.score).toBe(withoutBonus.score + 15);
  });

  it('returns null moyenne when no notes entered', () => {
    const { matieres, total } = coefficients.filieres.MP;
    const result = computeScore({}, matieres, total, false);
    expect(result.hasAnyNote).toBe(false);
    expect(result.moyenne).toBeNull();
  });
});

describe('moyenneForRank', () => {
  it('inverts estimateRank for a reachable target', () => {
    const target = 500;
    const moyenne = moyenneForRank(target, 'MP', distribution2025);
    expect(moyenne).not.toBeNull();
    expect(estimateRankValue(moyenne, 'MP', distribution2025)).toBeLessThanOrEqual(target);
  });

  it('returns null when target is unreachable even at 20/20', () => {
    expect(moyenneForRank(0, 'MP', distribution2025)).toBeNull();
  });
});

describe('smallestNoteReaching', () => {
  it('finds a quarter-point note for remaining matières', () => {
    const { matieres, total } = coefficients.filieres.MP;
    const target = 800;
    const note = smallestNoteReaching(target, 'MP', 0, total, total, distribution2025);
    expect(note).not.toBeNull();
    expect(note % 0.25).toBe(0);
  });
});
