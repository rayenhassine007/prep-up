/** Resources browser: favorites, recents, search. */

import { normalizeText } from '../search.js';

export const RECENT_MAX = 15;

export function keyOf(item) {
  return item && item.url ? item.url : null;
}

export function snapshot(item, ctx) {
  return {
    url: item.url,
    titre: item.titre,
    type: item.type || '',
    matiere: ctx.matiere,
    filiere: ctx.filiere,
    annee: ctx.annee,
  };
}

export function matchesSearchItem(item, matiere, query) {
  const q = normalizeText(String(query || '').trim());
  if (!q) return true;
  return (
    normalizeText(item.titre).includes(q)
    || normalizeText(item.type || '').includes(q)
    || normalizeText(matiere).includes(q)
  );
}

export function isFavInList(favoris, item) {
  const k = keyOf(item);
  return k != null && favoris.some((f) => f.url === k);
}

export function toggleFavInList(favoris, item, ctx) {
  const k = keyOf(item);
  if (k == null) return favoris;
  if (isFavInList(favoris, item)) return favoris.filter((f) => f.url !== k);
  return [{ ...snapshot(item, ctx) }, ...favoris];
}

export function noteOpenedInList(recents, item, ctx, max = RECENT_MAX) {
  const k = keyOf(item);
  if (k == null) return recents;
  const entry = { ...snapshot(item, ctx), ts: Date.now() };
  return [entry, ...recents.filter((r) => r.url !== k)].slice(0, max);
}

export function parseStoredList(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.url) : [];
  } catch {
    return [];
  }
}
