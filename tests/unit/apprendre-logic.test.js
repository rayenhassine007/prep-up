import { describe, expect, it } from 'vitest';
import {
  CHECKLIST,
  INTERVALLES,
  QUESTIONS,
  ajouterJours,
  aReviser,
  basculerRevision,
  checklistDuJour,
  dateDuJour,
  dateLisible,
  estDate,
  exporterIcs,
  modifierNotion,
  notionsValides,
  nouvelleNotion,
  reponsesValides,
  resultatQuiz,
  revisionsPour,
} from '../../src/lib/apprendre-logic.js';

const toutes = (rep) => Object.fromEntries(QUESTIONS.map((q) => [q.id, rep]));

describe('resultatQuiz', () => {
  it('waits for every answer before giving a profile', () => {
    expect(resultatQuiz({})).toBeNull();
    expect(resultatQuiz({ q1: 'oui' })).toBeNull();
    expect(resultatQuiz(undefined)).toBeNull();
  });

  it('scores Oui 2, Parfois 1, Non 0 and picks the profile', () => {
    expect(resultatQuiz(toutes('non'))).toMatchObject({ score: 0, max: 12, profil: { cle: 'stratege' } });
    expect(resultatQuiz(toutes('parfois'))).toMatchObject({ score: 6, profil: { cle: 'construction' } });
    expect(resultatQuiz(toutes('oui'))).toMatchObject({ score: 12, profil: { cle: 'marathonien' } });
  });

  it('puts the profile boundaries at 3 and 7', () => {
    const rep = { ...toutes('non'), q1: 'oui', q2: 'parfois' }; // 3
    expect(resultatQuiz(rep).profil.cle).toBe('stratege');
    expect(resultatQuiz({ ...rep, q3: 'parfois' }).profil.cle).toBe('construction'); // 4
    const sept = { ...toutes('non'), q1: 'oui', q2: 'oui', q3: 'oui', q4: 'parfois' };
    expect(resultatQuiz(sept).profil.cle).toBe('construction');
    expect(resultatQuiz({ ...sept, q5: 'parfois' }).profil.cle).toBe('marathonien'); // 8
  });

  it('points each Oui to its rule', () => {
    const rep = { ...toutes('non'), q1: 'oui', q5: 'oui', q6: 'oui' };
    expect(resultatQuiz(rep).cibles).toEqual(['regle-1', 'procrastination', 'regle-3']);
    expect(QUESTIONS.map((q) => q.cible)).toEqual(['regle-1', 'regle-4', 'regle-6', 'regle-2', 'procrastination', 'regle-3']);
  });

  it('keeps only known answers from storage', () => {
    expect(reponsesValides({ q1: 'oui', q2: 'peut-etre', zz: 'oui' })).toEqual({ q1: 'oui' });
    expect(reponsesValides('n’importe quoi')).toEqual({});
  });
});

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(estDate('2026-10-07')).toBe(true);
    expect(estDate('2026-02-30')).toBe(false);
    expect(estDate('07/10/2026')).toBe(false);
    expect(estDate('')).toBe(false);
  });

  it('adds days across months, years and leap days', () => {
    expect(ajouterJours('2026-10-07', 1)).toBe('2026-10-08');
    expect(ajouterJours('2026-12-20', 14)).toBe('2027-01-03');
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-03-28', 3)).toBe('2026-03-31'); // passage à l'heure d'été
  });

  it('formats today and readable dates', () => {
    expect(dateDuJour(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
    expect(dateLisible('2026-10-07')).toBe('7 oct. 2026');
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
    const { notion } = nouvelleNotion('  Séries entières ', '2026-10-07', 'a');
    expect(notion.nom).toBe('Séries entières');
    expect(notion.revisions).toHaveLength(5);
  });

  it('keeps ticks on rename, restarts the calendar on a new date', () => {
    const { notion } = nouvelleNotion('Séries', '2026-10-07', 'a');
    const [cochee] = basculerRevision([notion], 'a', 1);
    expect(modifierNotion(cochee, 'Séries entières', '2026-10-07').notion.revisions[0].faite).toBe(true);
    const deplacee = modifierNotion(cochee, 'Séries', '2026-10-09').notion;
    expect(deplacee.revisions[0]).toEqual({ j: 1, date: '2026-10-10', faite: false });
  });

  it('lists what is due today or late, oldest first, skipping done ones', () => {
    const a = nouvelleNotion('Intégrales', '2026-10-01', 'a').notion; // J+1 02, J+3 04, J+7 08
    const b = nouvelleNotion('Optique', '2026-10-06', 'b').notion; // J+1 07
    const notions = basculerRevision([a, b], 'a', 1);
    const dues = aReviser(notions, '2026-10-07');
    expect(dues.map((d) => [d.nom, d.j, d.enRetard])).toEqual([
      ['Intégrales', 3, true],
      ['Optique', 1, false],
    ]);
    expect(aReviser([], '2026-10-07')).toEqual([]);
  });

  it('drops malformed stored entries', () => {
    const bonne = nouvelleNotion('Optique', '2026-10-06', 'b').notion;
    expect(notionsValides([bonne, { id: 'x' }, null, { ...bonne, etude: 'hier' }])).toEqual([bonne]);
    expect(notionsValides('{}')).toEqual([]);
  });

  it('exports pending reviews as all-day calendar events', () => {
    const n = nouvelleNotion('Séries, suites; limites', '2026-10-07', 'a').notion;
    const ics = exporterIcs(basculerRevision([n], 'a', 1));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261011');
    expect(ics).toContain('SUMMARY:Réviser : Séries\\, suites\\; limites (J+3)');
    expect(ics).not.toContain('J+1)');
  });
});

describe('checklistDuJour', () => {
  it('starts empty on a new day', () => {
    const hier = { date: '2026-10-06', cochees: ['liste'], coucher: '23:00' };
    expect(checklistDuJour(hier, '2026-10-07')).toEqual({ date: '2026-10-07', cochees: [], coucher: '' });
    expect(checklistDuJour(null, '2026-10-07').cochees).toEqual([]);
  });

  it('keeps today’s ticks and bedtime, ignoring unknown keys', () => {
    const brut = { date: '2026-10-07', cochees: ['liste', 'pirate'], coucher: '22:30' };
    expect(checklistDuJour(brut, '2026-10-07')).toEqual({ date: '2026-10-07', cochees: ['liste'], coucher: '22:30' });
    expect(checklistDuJour({ ...brut, coucher: 'tard' }, '2026-10-07').coucher).toBe('');
    expect(CHECKLIST).toHaveLength(4);
  });
});
