// Règles de la page « Apprendre à apprendre », sans DOM ni stockage, pour
// qu'elles soient testables telles quelles : test rapide et planificateur de
// révisions espacées.

// ---------------------------------------------------------------------------
// Test rapide : 5 questions Oui / Non, chaque « Oui » désigne une méthode.
// ---------------------------------------------------------------------------

export const QUESTIONS = [
  { id: 'q1', methode: 1 },
  { id: 'q2', methode: 4 },
  { id: 'q3', methode: 2 },
  { id: 'q4', methode: 6 },
  { id: 'q5', methode: 3 },
];

const REPONSES = new Set(['oui', 'non']);

/** Ne garde d'une valeur stockée que des réponses connues. */
export function reponsesValides(brut) {
  const propre = {};
  if (!brut || typeof brut !== 'object') return propre;
  for (const q of QUESTIONS) {
    if (REPONSES.has(brut[q.id])) propre[q.id] = brut[q.id];
  }
  return propre;
}

/**
 * null tant qu'une question reste sans réponse ; sinon les méthodes à
 * travailler, dans l'ordre de la page.
 */
export function resultatQuiz(reponses) {
  const propres = reponsesValides(reponses);
  if (Object.keys(propres).length < QUESTIONS.length) return null;
  const priorites = QUESTIONS
    .filter((q) => propres[q.id] === 'oui')
    .map((q) => q.methode)
    .sort((a, b) => a - b);
  return { priorites };
}

export function questionsRestantes(reponses) {
  return QUESTIONS.length - Object.keys(reponsesValides(reponses)).length;
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

// Chiffres occidentaux dans les deux langues, comme on écrit en Tunisie.
const FORMATS = {};
export function dateLisible(date, langue = 'fr') {
  const locale = langue === 'ar' ? 'ar-TN' : 'fr-TN';
  FORMATS[locale] ??= new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', numberingSystem: 'latn',
  });
  const [a, m, j] = date.split('-').map(Number);
  return FORMATS[locale].format(new Date(Date.UTC(a, m - 1, j)));
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
// Langue de la page : ?lang= l'emporte, puis le choix mémorisé, sinon français.
// ---------------------------------------------------------------------------

export const LANGUES = ['fr', 'ar'];

export function langueInitiale(search, memorisee) {
  const demandee = new URLSearchParams(search || '').get('lang');
  if (LANGUES.includes(demandee)) return demandee;
  if (LANGUES.includes(memorisee)) return memorisee;
  return 'fr';
}

// ---------------------------------------------------------------------------
// Export agenda (.ics) : lu par Apple Calendrier, Google Agenda, Outlook et
// l'agenda Samsung. Une révision = un événement sur la journée, avec un
// rappel à 9 h. L'UID est stable : réimporter met à jour au lieu de doubler.
// ---------------------------------------------------------------------------

function echapperIcs(texte) {
  return String(texte)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// La norme coupe les lignes à 75 octets (pas caractères : l'arabe en prend 2).
export function plierLigneIcs(ligne) {
  const enc = new TextEncoder();
  if (enc.encode(ligne).length <= 75) return ligne;
  const morceauxLigne = [];
  let courant = '';
  let taille = 0;
  for (const car of ligne) {
    const n = enc.encode(car).length;
    const limite = morceauxLigne.length ? 74 : 75; // l'espace de continuation compte
    if (taille + n > limite) {
      morceauxLigne.push(courant);
      courant = '';
      taille = 0;
    }
    courant += car;
    taille += n;
  }
  morceauxLigne.push(courant);
  return morceauxLigne.join('\r\n ');
}

/**
 * @param notions  les notions du planificateur
 * @param options  titre(nom, j) et description : textes dans la langue de la page
 */
export function exporterIcs(notions, { titre, description = '', horodatage = '20260101T000000Z' }) {
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prep\'Up//Repetition espacee//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const n of notions) {
    for (const r of n.revisions) {
      if (r.faite) continue;
      const nomEvenement = echapperIcs(titre(n.nom, r.j));
      lignes.push(
        'BEGIN:VEVENT',
        `UID:${n.id}-j${r.j}@prep-upp.com`,
        `DTSTAMP:${horodatage}`,
        `DTSTART;VALUE=DATE:${r.date.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${ajouterJours(r.date, 1).replace(/-/g, '')}`,
        `SUMMARY:${nomEvenement}`,
        ...(description ? [`DESCRIPTION:${echapperIcs(description)}`] : []),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${nomEvenement}`,
        'TRIGGER;RELATED=START:PT9H',
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lignes.push('END:VCALENDAR');
  return lignes.map(plierLigneIcs).join('\r\n') + '\r\n';
}

export function revisionsAVenir(notions) {
  return notions.reduce((n, x) => n + x.revisions.filter((r) => !r.faite).length, 0);
}
