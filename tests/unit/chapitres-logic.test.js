import { describe, expect, it } from 'vitest';
import data from '../../src/data/chapitres_concours_mp.json' with { type: 'json' };
import dataT from '../../src/data/chapitres_concours_t.json' with { type: 'json' };
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
  it.each([['MP', data], ['T', dataT]])('sorts %s épreuves by coefficient descending', (_, set) => {
    const sorted = sortEpreuves(set.epreuves);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1][1].coefficient).toBeGreaterThanOrEqual(sorted[i][1].coefficient);
    }
  });
});

// Every filière file is rendered by the same code, so it has to satisfy the
// same shape. A file that fails these would render silently wrong rows.
describe.each([['MP', data], ['T', dataT]])('%s dataset integrity', (_, set) => {
  const chapitres = Object.values(set.epreuves).flatMap((e) => e.chapitres);

  it('gives every épreuve a short label and a coefficient', () => {
    for (const e of Object.values(set.epreuves)) {
      expect(typeof e.court).toBe('string');
      expect(e.court.length).toBeGreaterThan(0);
      expect(typeof e.coefficient).toBe('number');
      expect(typeof e.seuil_presence_questions).toBe('number');
    }
  });

  it('lists exactly as many years as the session count claims', () => {
    for (const c of chapitres) {
      expect(c.annees_presentes).toHaveLength(c.sessions_ou_present);
    }
  });

  it('keeps every present year inside the analysed range, sorted and unique', () => {
    for (const c of chapitres) {
      const analysed = new Set(c.annees_analysees);
      expect(c.annees_analysees).toHaveLength(c.sessions_analysees);
      for (const y of c.annees_presentes) expect(analysed.has(y)).toBe(true);
      expect(c.annees_presentes).toEqual([...new Set(c.annees_presentes)].sort((a, b) => a - b));
    }
  });

  it('has no unaccented physics label left', () => {
    const physique = Object.values(set.epreuves).find((e) => e.epreuve === 'Physique');
    if (!physique) return;
    for (const c of physique.chapitres) {
      expect(nomDe(c)).not.toMatch(/electro|mecanique|energie|geometrique/i);
    }
  });
});

describe('barWidth', () => {
  it('computes percentage width', () => {
    expect(barWidth(6, 12)).toBe(50);
    expect(barWidth(0, 12)).toBe(0);
  });
});
