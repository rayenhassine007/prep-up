import { describe, expect, it } from 'vitest';
import data from '../../src/data/chapitres_concours_mp.json' with { type: 'json' };
import dataPC from '../../src/data/chapitres_concours_pc.json' with { type: 'json' };
import dataT from '../../src/data/chapitres_concours_t.json' with { type: 'json' };
import dataBG from '../../src/data/chapitres_concours_bg.json' with { type: 'json' };

const FILIERES = [
  ['MP', data],
  ['PC', dataPC],
  ['T', dataT],
  ['BG', dataBG],
];
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
  it.each(FILIERES)('sorts %s épreuves by coefficient descending', (_, set) => {
    const sorted = sortEpreuves(set.epreuves);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1][1].coefficient).toBeGreaterThanOrEqual(sorted[i][1].coefficient);
    }
  });
});

// Every filière file is rendered by the same code, so it has to satisfy the
// same shape. A file that fails these would render silently wrong rows.
describe.each(FILIERES)('%s dataset integrity', (_, set) => {
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

  it('gives the band the count actually earns', () => {
    for (const c of chapitres) {
      const f = c.sessions_ou_present / c.sessions_analysees;
      let attendue = 'rare';
      if (c.sessions_ou_present === 0) attendue = 'jamais rencontré';
      else if (f >= 1) attendue = 'incontournable';
      else if (f >= 0.8) attendue = 'très régulier';
      else if (f >= 0.6) attendue = 'régulier';
      else if (f >= 0.4) attendue = 'variable';
      expect(c.regularite).toBe(attendue);
    }
  });

  // Le chapitre parent est la seconde ligne de la rangée. Une épreuve qui n'en
  // nomme que sur une partie de ses chapitres afficherait une liste bancale ;
  // n'en nommer aucun est permis (la source T n'en donne pas pour la physique).
  it('names a parent chapter on all of a sub-chapter épreuve or on none', () => {
    for (const e of Object.values(set.epreuves)) {
      if (e.niveau !== 'sous-chapitre') continue;
      const avec = e.chapitres.filter((c) => c.chapitre_parent).length;
      expect([0, e.chapitres.length]).toContain(avec);
    }
  });

  // Une session non analysée garde sa case dans la grille : elle doit donc
  // rester hors des années analysées, sinon elle serait comptée deux fois.
  it('keeps unanalysed sessions out of the analysed years', () => {
    for (const e of Object.values(set.epreuves)) {
      if (!e.annees_absentes) continue;
      expect(e.annees_absentes).toEqual([...new Set(e.annees_absentes)].sort((a, b) => a - b));
      for (const c of e.chapitres) {
        for (const y of e.annees_absentes) {
          expect(c.annees_analysees).not.toContain(y);
          expect(c.annees_presentes).not.toContain(y);
        }
      }
    }
  });

  // Règle du site : aucun tiret cadratin dans un texte publié.
  it('carries no em dash in any displayed label', () => {
    for (const e of Object.values(set.epreuves)) {
      expect(e.epreuve).not.toMatch(/—/);
      expect(e.court).not.toMatch(/—/);
    }
    for (const c of chapitres) {
      expect(nomDe(c)).not.toMatch(/—/);
      expect(String(c.chapitre_parent ?? '')).not.toMatch(/—/);
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
