/** MP exam chapter display helpers. */

export const ANNEE_SUFFIXE = /\s*\((?:1re|1ère|2e|2ème)\s+ann[ée]e\)/g;

export const BANDES = {
  incontournable: 'b-incontournable',
  'très régulier': 'b-tres-regulier',
  régulier: 'b-regulier',
  variable: 'b-variable',
  rare: 'b-rare',
  'jamais rencontré': 'b-jamais',
};

export function propre(s) {
  return String(s ?? '').replace(ANNEE_SUFFIXE, '');
}

export function nomDe(c) {
  return propre(c.sous_chapitre || c.chapitre);
}

export function sansDoublons(chapitres) {
  const vus = new Set();
  return chapitres.filter((c) => {
    const cle = `${nomDe(c)}|${c.sessions_ou_present}|${c.regularite}|${propre(c.chapitre_parent)}`;
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

export function sansZeroHomonyme(jamais, rencontres) {
  const noms = new Set(rencontres.map(nomDe));
  return jamais.filter((c) => !noms.has(nomDe(c)));
}

export function sessionYears(c, e) {
  if (Array.isArray(c.annees_analysees) && c.annees_analysees.length) {
    return c.annees_analysees.map(Number);
  }
  const m = String(e.annees || '').match(/(\d{4})\s*[–—-]\s*(\d{4})/);
  if (!m) return null;
  const years = [];
  for (let y = Number(m[1]); y <= Number(m[2]); y++) years.push(y);
  return years.length === e.sessions_analysees ? years : null;
}

export function presentYears(c, years) {
  if (!years || !Array.isArray(c.annees_presentes) || !c.annees_presentes.length) return null;
  return new Set(c.annees_presentes.map(Number));
}

export function sortEpreuves(epreuves) {
  return Object.entries(epreuves).sort((a, b) => b[1].coefficient - a[1].coefficient);
}

export function barWidth(sessionsPresent, sessionsAnalysed) {
  if (!sessionsAnalysed) return 0;
  return (sessionsPresent / sessionsAnalysed) * 100;
}
