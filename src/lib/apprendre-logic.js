// Règles de la page « Apprendre à apprendre », sans DOM ni stockage, pour
// qu'elles soient testables telles quelles : score du quiz, dates de
// répétition espacée, checklist du soir.

// ---------------------------------------------------------------------------
// Quiz : chaque « Oui » compte une mauvaise habitude.
// ---------------------------------------------------------------------------

export const REPONSES = [
  ['oui', 'Oui', 2],
  ['parfois', 'Parfois', 1],
  ['non', 'Non', 0],
];

// `cible` : l'ancre de la règle (ou de la section) qui répond à l'habitude.
export const QUESTIONS = [
  { id: 'q1', texte: 'Quand je bloque sur un exercice, je lis la correction puis je passe au suivant.', cible: 'regle-1' },
  { id: 'q2', texte: 'Pour réviser, je relis surtout mon cours ou mes fiches.', cible: 'regle-4' },
  { id: 'q3', texte: 'Je révise une matière pendant des heures d’affilée, puis je passe à une autre le lendemain.', cible: 'regle-6' },
  { id: 'q4', texte: 'Je travaille beaucoup la veille des DS et des colles, moins le reste du temps.', cible: 'regle-2' },
  { id: 'q5', texte: 'Je repousse souvent le début d’une séance de travail.', cible: 'procrastination' },
  { id: 'q6', texte: 'Je dors moins pour travailler plus en période d’examens.', cible: 'regle-3' },
];

export const PROFILS = [
  {
    cle: 'stratege',
    max: 3,
    nom: 'Stratège',
    texte: 'Tu as déjà de bonnes habitudes. Les règles 6 à 10 t’aideront à aller plus loin.',
  },
  {
    cle: 'construction',
    max: 7,
    nom: 'En construction',
    texte: 'Quelques habitudes te coûtent des heures. Commence par les règles 1, 2 et 4.',
  },
  {
    cle: 'marathonien',
    max: 12,
    nom: 'Marathonien épuisé',
    texte: 'Tu travailles dur mais pas efficacement. Bonne nouvelle : c’est là que tu peux gagner le plus. Commence par les règles 1 et 4, et par la section procrastination.',
  },
];

function points(reponse) {
  const trouve = REPONSES.find(([cle]) => cle === reponse);
  return trouve ? trouve[2] : null;
}

/**
 * Résultat du quiz, ou null tant qu'une question reste sans réponse : un
 * profil calculé sur la moitié des questions serait trompeur.
 */
export function resultatQuiz(reponses) {
  let score = 0;
  for (const q of QUESTIONS) {
    const p = points(reponses?.[q.id]);
    if (p == null) return null;
    score += p;
  }
  const profil = PROFILS.find((pr) => score <= pr.max);
  const cibles = QUESTIONS.filter((q) => reponses[q.id] === 'oui').map((q) => q.cible);
  return { score, max: QUESTIONS.length * 2, profil, cibles };
}

/** Ne garde d'une valeur stockée que des réponses connues. */
export function reponsesValides(brut) {
  const propre = {};
  if (!brut || typeof brut !== 'object') return propre;
  for (const q of QUESTIONS) {
    if (points(brut[q.id]) != null) propre[q.id] = brut[q.id];
  }
  return propre;
}

// ---------------------------------------------------------------------------
// Dates : chaînes « AAAA-MM-JJ » en heure locale. On calcule en UTC pour qu'un
// changement d'heure ne décale jamais une révision d'un jour.
// ---------------------------------------------------------------------------

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function estDate(texte) {
  const m = DATE.exec(String(texte || ''));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function dateDuJour(maintenant = new Date()) {
  const a = maintenant.getFullYear();
  const m = String(maintenant.getMonth() + 1).padStart(2, '0');
  const j = String(maintenant.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

export function ajouterJours(date, n) {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return d.toISOString().slice(0, 10);
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dateLisible(date) {
  const [a, m, j] = date.split('-').map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
}

// ---------------------------------------------------------------------------
// Répétition espacée
// ---------------------------------------------------------------------------

export const INTERVALLES = [1, 3, 7, 14, 30];
export const MAX_NOM = 120;

export function revisionsPour(dateEtude) {
  return INTERVALLES.map((j) => ({ j, date: ajouterJours(dateEtude, j), faite: false }));
}

export function nouvelleNotion(nom, dateEtude, id) {
  const propre = String(nom || '').trim().slice(0, MAX_NOM);
  if (!propre) return { ok: false, raison: 'nom' };
  if (!estDate(dateEtude)) return { ok: false, raison: 'date' };
  return { ok: true, notion: { id, nom: propre, etude: dateEtude, revisions: revisionsPour(dateEtude) } };
}

/**
 * Modifier une notion. Si la date d'étude change, le calendrier repart de
 * zéro : des cases cochées sur l'ancien calendrier ne voudraient plus rien dire.
 */
export function modifierNotion(notion, nom, dateEtude) {
  const propre = String(nom || '').trim().slice(0, MAX_NOM);
  if (!propre) return { ok: false, raison: 'nom' };
  if (!estDate(dateEtude)) return { ok: false, raison: 'date' };
  const revisions = dateEtude === notion.etude ? notion.revisions : revisionsPour(dateEtude);
  return { ok: true, notion: { ...notion, nom: propre, etude: dateEtude, revisions } };
}

export function basculerRevision(notions, id, j) {
  return notions.map((n) => (n.id !== id ? n : {
    ...n,
    revisions: n.revisions.map((r) => (r.j === j ? { ...r, faite: !r.faite } : r)),
  }));
}

/** Révisions non faites dont la date est aujourd'hui ou passée, la plus ancienne d'abord. */
export function aReviser(notions, aujourdhui) {
  const dues = [];
  for (const n of notions) {
    for (const r of n.revisions) {
      if (!r.faite && r.date <= aujourdhui) {
        dues.push({ id: n.id, nom: n.nom, j: r.j, date: r.date, enRetard: r.date < aujourdhui });
      }
    }
  }
  return dues.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.nom.localeCompare(b.nom)));
}

/** Relit le planificateur stocké en écartant tout ce qui est mal formé. */
export function notionsValides(brut) {
  if (!Array.isArray(brut)) return [];
  return brut.filter((n) => n
    && typeof n.id === 'string'
    && typeof n.nom === 'string' && n.nom.trim()
    && estDate(n.etude)
    && Array.isArray(n.revisions)
    && n.revisions.every((r) => r && Number.isFinite(r.j) && estDate(r.date) && typeof r.faite === 'boolean'));
}

// ---------------------------------------------------------------------------
// Export .ics : un événement d'une journée par révision.
// ---------------------------------------------------------------------------

function echapperIcs(texte) {
  return String(texte).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function exporterIcs(notions, horodatage = '20260101T000000Z') {
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prep\'Up//Repetition espacee//FR',
    'CALSCALE:GREGORIAN',
  ];
  for (const n of notions) {
    for (const r of n.revisions) {
      if (r.faite) continue;
      const jour = r.date.replace(/-/g, '');
      const lendemain = ajouterJours(r.date, 1).replace(/-/g, '');
      lignes.push(
        'BEGIN:VEVENT',
        `UID:${n.id}-j${r.j}@prep-upp.com`,
        `DTSTAMP:${horodatage}`,
        `DTSTART;VALUE=DATE:${jour}`,
        `DTEND;VALUE=DATE:${lendemain}`,
        `SUMMARY:${echapperIcs(`Réviser : ${n.nom} (J+${r.j})`)}`,
        'END:VEVENT',
      );
    }
  }
  lignes.push('END:VCALENDAR');
  return lignes.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Checklist du soir : elle repart vide chaque jour.
// ---------------------------------------------------------------------------

export const CHECKLIST = [
  ['liste', 'J’ai écrit ma liste de tâches de demain'],
  ['appris', 'J’ai noté ce que j’ai appris aujourd’hui (3 points, de mémoire)'],
  ['formules', 'J’ai relu rapidement les formules et méthodes du jour'],
  ['revisions', 'J’ai vérifié mes révisions espacées de demain'],
];

export function checklistDuJour(brut, aujourdhui) {
  const vide = { date: aujourdhui, cochees: [], coucher: '' };
  if (!brut || brut.date !== aujourdhui) return vide;
  const cles = new Set(CHECKLIST.map(([c]) => c));
  const cochees = Array.isArray(brut.cochees) ? brut.cochees.filter((c) => cles.has(c)) : [];
  const coucher = /^\d{2}:\d{2}$/.test(brut.coucher || '') ? brut.coucher : '';
  return { date: aujourdhui, cochees, coucher };
}
