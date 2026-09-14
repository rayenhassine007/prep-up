// Règles du bouton de retour et du micro-sondage, sans DOM ni réseau, pour
// qu'elles soient testables telles quelles.

// Les quatre choses qu'un visiteur veut dire. L'ordre est celui des boutons.
export const TYPES = [
  ['idee', 'Une idée'],
  ['changer', 'Quelque chose à changer'],
  ['erreur', 'Une erreur dans les chiffres'],
  ['bug', 'Un bug'],
];

export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 2000;
// Un envoi toutes les deux minutes suffit à un humain et coupe court au
// martèlement d'un script.
export const DELAI_ENVOI_MS = 2 * 60 * 1000;

export function estType(type) {
  return TYPES.some(([cle]) => cle === type);
}

export function validerRetour({ type, message }) {
  if (!estType(type)) return { ok: false, raison: 'type' };
  const texte = String(message ?? '').trim();
  if (texte.length < MIN_MESSAGE) return { ok: false, raison: 'court' };
  if (texte.length > MAX_MESSAGE) return { ok: false, raison: 'long' };
  return { ok: true, message: texte };
}

// Une horloge qui recule (fuseau, machine remise à l'heure) ne doit pas bloquer
// quelqu'un pour deux minutes : dans le doute on laisse envoyer.
export function peutEnvoyer(maintenant, dernierEnvoi, fenetre = DELAI_ENVOI_MS) {
  const precedent = Number(dernierEnvoi);
  if (!Number.isFinite(precedent) || precedent <= 0) return true;
  const ecart = maintenant - precedent;
  if (!Number.isFinite(ecart) || ecart < 0) return true;
  return ecart >= fenetre;
}

// Ce qui part avec le message, pour qu'un signalement soit exploitable :
// « /chapitres-concours | BG | Chimie organique | 390 px » vaut mieux que
// « il y a une erreur en chimie ».
export function contexte({ url, filiere, epreuve, largeur } = {}) {
  return [
    url,
    filiere && `filière ${filiere}`,
    epreuve && `épreuve ${epreuve}`,
    Number.isFinite(largeur) && `${largeur} px`,
  ].filter(Boolean).join(' | ');
}

// Le micro-sondage se pose une fois par page, pas une fois par site.
export function clePage(pathname) {
  const chemin = String(pathname || '/').replace(/\.html$/, '').replace(/\/+$/, '');
  return `pu-avis:${chemin || '/'}`;
}
