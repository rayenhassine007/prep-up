// Quelles pages annoncer à IndexNow après un déploiement, d'après les fichiers
// modifiés. Pur (pas de réseau, pas de git) pour être testé tel quel ;
// scripts/indexnow.mjs s'occupe du reste.

export const INDEXNOW_KEY = '4d4c3abd0296621e5a6111d8a7ab4203';
export const HOTE = 'prep-upp.com';
export const SITE = `https://${HOTE}`;

// Fichier modifié → chemin de la page touchée. L'ordre compte : la première
// règle qui correspond gagne.
const REGLES = [
  // propre à une page
  [/^index\.html$/, '/'],
  [/^calculateur\.html$|^src\/(calculator|simulateur|objectif|annee1)\.js$|^src\/lib\/(rank|calculator-reach|simulateur-logic|objectif-logic|annee1-logic)\.js$|^src\/data\/(coefficients|coefficients_1ere_annee|distribution_moyennes_[^/]+|guide_rangs_capacites|rangs_[^/]+)\.json$/, '/calculateur'],
  [/^ressources\.html$|^src\/(ressources|navigateur)\.js$|^src\/lib\/(ressources-logic|navigateur-integre|contact)\.js$|^src\/data\/ressources\.json$|^public\/sources\//, '/ressources'],
  [/^places-2026\.html$|^src\/places\.js$|^src\/data\/places2026\.json$/, '/places-2026'],
  [/^chapitres-concours\.html$|^src\/chapitres\.js$|^src\/lib\/chapitres-logic\.js$|^src\/data\/chapitres_concours_[a-z]+\.json$/, '/chapitres-concours'],
  [/^apprendre-a-apprendre\.html$|^src\/apprendre\.js$|^src\/lib\/apprendre-[a-z0-9-]+\.js$|^public\/og-apprendre\./, '/apprendre-a-apprendre'],
  // commun à tout le site : toutes les pages changent
  [/^src\/styles\/|^src\/(ui|feedback|icons|search|analytics)\.js$|^src\/lib\/feedback-logic\.js$|^public\/(icons\.svg|logo\.(png|svg)|og-image\.(png|svg)|sitemap\.xml)$|^vite\.config\.js$|^vercel\.json$|^scripts\/prerender\.mjs$|^package(-lock)?\.json$/, '*'],
];

/** Les adresses listées dans le sitemap (source de vérité des pages publiques). */
export function urlsDuSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/**
 * Les URL à annoncer pour une liste de fichiers modifiés, dans l'ordre du
 * sitemap. Tests, documentation et outillage ne déclenchent rien.
 */
export function urlsModifiees(fichiers, urlsSitemap) {
  const chemins = new Set();
  for (const f of fichiers) {
    const regle = REGLES.find(([motif]) => motif.test(f));
    if (!regle) continue;
    if (regle[1] === '*') return [...urlsSitemap];
    chemins.add(SITE + (regle[1] === '/' ? '/' : regle[1]));
  }
  return urlsSitemap.filter((u) => chemins.has(u));
}

/** Corps de la requête attendu par https://api.indexnow.org/indexnow. */
export function corpsIndexNow(urls) {
  return {
    host: HOTE,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
}
