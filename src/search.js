// Shared text normalization for the site's search boxes.
//
// The content is French: it mixes accents (é, è, ç, ô…) and both apostrophe
// styles (' and ’), while people usually type without accents — especially on
// a phone keyboard. Normalizing both the query and the searched text means
// "algebre" matches "Algèbre" and "d'ingenieurs" matches "d’Ingénieurs".

export function normalizeText(str) {
  return String(str ?? '')
    .normalize('NFD') // split accented letters into base letter + combining mark
    .replace(/[\u0300-\u036f]/g, '') // drop the combining marks (é -> e, ç -> c)
    .replace(/[‘’]/g, "'") // unify curly apostrophes with the typed one
    .toLowerCase();
}
