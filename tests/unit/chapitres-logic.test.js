import { describe, expect, it } from 'vitest';
import data from '../../src/data/chapitres_concours_mp.json' with { type: 'json' };
import {
  barWidth,
  nomDe,
  propre,
  sansDoublons,
  sansZeroHomonyme,
  sessionYears,
  sortEpreuves,
} from '../../src/lib/chapitres-logic.js';

describe('propre and nomDe', () => {
  it('strips year suffix from chapter names', () => {
    expect(propre('Algèbre (1re année)')).toBe('Algèbre');
    expect(nomDe({ chapitre: 'Analyse (2e année)' })).toBe('Analyse');
    expect(nomDe({ sous_chapitre: 'Suites', chapitre: 'Analyse' })).toBe('Suites');
  });
});

describe('sansDoublons', () => {
  it('removes identical display rows', () => {
    const chapitres = [
      { chapitre: 'Foo', sessions_ou_present: 5, regularite: 'régulier' },
      { chapitre: 'Foo', sessions_ou_present: 5, regularite: 'régulier' },
      { chapitre: 'Bar', sessions_ou_present: 3, regularite: 'variable' },
    ];
    expect(sansDoublons(chapitres)).toHaveLength(2);
  });
});

describe('sansZeroHomonyme', () => {
  it('drops zero-count homonyms when encountered version exists', () => {
    const rencontres = [{ chapitre: 'Suites' }];
    const jamais = [{ chapitre: 'Suites' }, { chapitre: 'Autre' }];
    expect(sansZeroHomonyme(jamais, rencontres)).toHaveLength(1);
    expect(sansZeroHomonyme(jamais, rencontres)[0].chapitre).toBe('Autre');
  });
});

describe('sessionYears', () => {
  it('uses explicit annees_analysees when present', () => {
    const e = { sessions_analysees: 3, annees: '2015–2017' };
    const c = { annees_analysees: [2015, 2016, 2017] };
    expect(sessionYears(c, e)).toEqual([2015, 2016, 2017]);
  });

  it('derives years from range when length matches sessions', () => {
    const e = { sessions_analysees: 2, annees: '2015–2016' };
    expect(sessionYears({}, e)).toEqual([2015, 2016]);
  });
});

describe('sortEpreuves', () => {
  it('sorts by coefficient descending', () => {
    const sorted = sortEpreuves(data.epreuves);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1][1].coefficient).toBeGreaterThanOrEqual(sorted[i][1].coefficient);
    }
  });
});

describe('barWidth', () => {
  it('computes percentage width', () => {
    expect(barWidth(6, 12)).toBe(50);
    expect(barWidth(0, 12)).toBe(0);
  });
});
