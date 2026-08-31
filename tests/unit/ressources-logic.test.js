import { describe, expect, it } from 'vitest';
import {
  isFavInList,
  matchesSearchItem,
  noteOpenedInList,
  parseStoredList,
  toggleFavInList,
} from '../../src/lib/ressources-logic.js';

const item = { titre: 'DS Algèbre', type: 'PDF', url: 'https://example.com/a' };
const ctx = { matiere: 'Maths', filiere: 'MP', annee: '2ème année' };

describe('matchesSearchItem', () => {
  it('matches accent-insensitive titre and matiere', () => {
    expect(matchesSearchItem(item, 'Maths', 'algebre')).toBe(true);
    expect(matchesSearchItem(item, 'Maths', 'physique')).toBe(false);
  });

  it('returns true for empty query', () => {
    expect(matchesSearchItem(item, 'Maths', '')).toBe(true);
  });
});

describe('favorites', () => {
  it('toggles favorite by URL', () => {
    let favs = [];
    favs = toggleFavInList(favs, item, ctx);
    expect(isFavInList(favs, item)).toBe(true);
    favs = toggleFavInList(favs, item, ctx);
    expect(isFavInList(favs, item)).toBe(false);
  });
});

describe('recents', () => {
  it('prepends and dedupes by URL', () => {
    const other = { ...item, url: 'https://example.com/b' };
    let recents = noteOpenedInList([], item, ctx);
    recents = noteOpenedInList(recents, other, ctx);
    recents = noteOpenedInList(recents, item, ctx);
    expect(recents).toHaveLength(2);
    expect(recents[0].url).toBe(item.url);
  });

  it('caps list at 15 entries', () => {
    let recents = [];
    for (let i = 0; i < 20; i++) {
      recents = noteOpenedInList(recents, { ...item, url: `https://example.com/${i}` }, ctx);
    }
    expect(recents).toHaveLength(15);
  });
});

describe('parseStoredList', () => {
  it('parses valid JSON array with urls', () => {
    const raw = JSON.stringify([{ url: 'https://a.com', titre: 'A' }, { titre: 'no url' }]);
    expect(parseStoredList(raw)).toHaveLength(1);
  });

  it('returns empty array on invalid JSON', () => {
    expect(parseStoredList('not json')).toEqual([]);
  });
});
