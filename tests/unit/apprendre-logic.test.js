import { describe, expect, it } from 'vitest';
import {
  INTERVALLES,
  QUESTIONS,
  ajouterJours,
  aReviser,
  basculerRevision,
  dateDuJour,
  dateLisible,
  estDate,
  langueInitiale,
  notionsValides,
  nouvelleNotion,
  questionsRestantes,
  reponsesValides,
  resultatQuiz,
  revisionsPour,
} from '../../src/lib/apprendre-logic.js';

const toutes = (rep) => Object.fromEntries(QUESTIONS.map((q) => [q.id, rep]));

describe('test rapide', () => {
  it('has 5 questions pointing to methods 1, 4, 2, 6 and 3', () => {
    expect(QUESTIONS.map((q) => q.methode)).toEqual([1, 4, 2, 6, 3]);
  });

  it('waits for every answer', () => {
    expect(resultatQuiz({})).toBeNull();
    expect(resultatQuiz({ q1: 'oui' })).toBeNull();
    expect(questionsRestantes({ q1: 'oui', q2: 'non' })).toBe(3);
  });

  it('lists the methods behind each Oui, in page order', () => {
    expect(resultatQuiz(toutes('non'))).toEqual({ priorites: [] });
    expect(resultatQuiz(toutes('oui'))).toEqual({ priorites: [1, 2, 3, 4, 6] });
    expect(resultatQuiz({ ...toutes('non'), q2: 'oui', q5: 'oui' })).toEqual({ priorites: [3, 4] });
  });

  it('keeps only known answers from storage', () => {
    expect(reponsesValides({ q1: 'oui', q2: 'parfois', zz: 'oui' })).toEqual({ q1: 'oui' });
    expect(reponsesValides('n’importe quoi')).toEqual({});
  });
});

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(estDate('2026-10-07')).toBe(true);
    expect(estDate('2026-02-30')).toBe(false);
    expect(estDate('07/10/2026')).toBe(false);
  });

  it('adds days across months, years and leap days', () => {
    expect(ajouterJours('2026-12-20', 14)).toBe('2027-01-03');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-03-28', 3)).toBe('2026-03-31'); // passage à l'heure d'été
  });

  it('formats dates in French and Arabic with Western digits', () => {
    expect(dateDuJour(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
    const fr = dateLisible('2026-10-07', 'fr');
    const ar = dateLisible('2026-10-07', 'ar');
    expect(fr).toMatch(/7/);
    expect(fr).toMatch(/2026/);
    expect(ar).toMatch(/7/);
    expect(ar).toMatch(/2026/);
    expect(ar).not.toMatch(/[٠-٩]/);
  });
});

describe('répétition espacée', () => {
  it('schedules J+1, J+3, J+7, J+14 and J+30', () => {
    expect(INTERVALLES).toEqual([1, 3, 7, 14, 30]);
    expect(revisionsPour('2026-10-07').map((r) => r.date))
      .toEqual(['2026-10-08', '2026-10-10', '2026-10-14', '2026-10-21', '2026-11-06']);
  });

  it('refuses an empty name or a bad date', () => {
    expect(nouvelleNotion('  ', '2026-10-07', 'a')).toEqual({ ok: false, raison: 'nom' });
    expect(nouvelleNotion('Séries', '2026-13-01', 'a')).toEqual({ ok: false, raison: 'date' });
    expect(nouvelleNotion('  Séries entières ', '2026-10-07', 'a').notion.nom).toBe('Séries entières');
  });

  it('lists what is due today or late, oldest first, skipping done ones', () => {
    const a = nouvelleNotion('Intégrales', '2026-10-01', 'a').notion;
    const b = nouvelleNotion('Optique', '2026-10-06', 'b').notion;
    const dues = aReviser(basculerRevision([a, b], 'a', 1), '2026-10-07');
    expect(dues.map((d) => [d.nom, d.j, d.enRetard])).toEqual([
      ['Intégrales', 3, true],
      ['Optique', 1, false],
    ]);
  });

  it('drops malformed stored entries', () => {
    const bonne = nouvelleNotion('Optique', '2026-10-06', 'b').notion;
    expect(notionsValides([bonne, { id: 'x' }, null, { ...bonne, etude: 'hier' }])).toEqual([bonne]);
    expect(notionsValides('{}')).toEqual([]);
  });
});

describe('langueInitiale', () => {
  it('prefers ?lang=, then the stored choice, then French', () => {
    expect(langueInitiale('?lang=ar', 'fr')).toBe('ar');
    expect(langueInitiale('?lang=fr', 'ar')).toBe('fr');
    expect(langueInitiale('', 'ar')).toBe('ar');
    expect(langueInitiale('?lang=en', null)).toBe('fr');
    expect(langueInitiale('', null)).toBe('fr');
  });
});

describe('export agenda (.ics)', async () => {
  const { exporterIcs, plierLigneIcs, revisionsAVenir } = await import('../../src/lib/apprendre-logic.js');
  const titre = (nom, j) => `Réviser : ${nom} (J+${j})`;

  it('writes one all-day event per pending review, with a 9 am reminder', () => {
    const n = nouvelleNotion('Séries, suites; limites', '2026-10-07', 'a').notion;
    const notions = basculerRevision([n], 'a', 1);
    const ics = exporterIcs(notions, { titre, description: 'Prep\'Up' });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain('UID:a-j3@prep-upp.com');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261011');
    expect(ics).toContain('SUMMARY:Réviser : Séries\\, suites\\; limites (J+3)');
    expect(ics).toContain('TRIGGER;RELATED=START:PT9H');
    expect(ics).not.toContain('(J+1)');
    expect(revisionsAVenir(notions)).toBe(4);
  });

  it('folds long lines at 75 bytes, Arabic included', () => {
    const longue = 'SUMMARY:' + 'مراجعة: المتسلسلات الصحيحة والتكاملات المعمّمة (J+14)'.repeat(2);
    const pliee = plierLigneIcs(longue);
    const enc = new TextEncoder();
    for (const morceau of pliee.split('\r\n')) expect(enc.encode(morceau).length).toBeLessThanOrEqual(75);
    expect(pliee.split('\r\n').map((m, i) => (i ? m.slice(1) : m)).join('')).toBe(longue);
    expect(plierLigneIcs('court')).toBe('court');
  });
});
