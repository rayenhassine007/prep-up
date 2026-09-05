import { describe, expect, it } from 'vitest';
import {
  isFavInList,
  hasLinkOrFile,
  isValidResourceLink,
  matchesSearchItem,
  noteOpenedInList,
  parseStoredList,
  toggleFavInList,
  validateProposal,
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

describe('hasLinkOrFile', () => {
  it('accepts a valid link alone', () => {
    expect(hasLinkOrFile('https://drive.google.com/x', null)).toBe(true);
    expect(hasLinkOrFile('  https://mega.nz/x  ', [])).toBe(true);
    expect(hasLinkOrFile('drive.google.com/file/d/abc', null)).toBe(true);
  });

  it('accepts a selected file alone', () => {
    expect(hasLinkOrFile('', { length: 1 })).toBe(true);
    expect(hasLinkOrFile('   ', { length: 2 })).toBe(true);
  });

  it('rejects when both link and file are empty', () => {
    expect(hasLinkOrFile('', null)).toBe(false);
    expect(hasLinkOrFile('   ', [])).toBe(false);
    expect(hasLinkOrFile(undefined, undefined)).toBe(false);
  });

  it('rejects nonsense that is not a URL', () => {
    expect(hasLinkOrFile('asdf', null)).toBe(false);
    expect(hasLinkOrFile('hello world', { length: 1 })).toBe(false);
  });
});

describe('isValidResourceLink', () => {
  it('accepts http(s) URLs', () => {
    expect(isValidResourceLink('https://drive.google.com/file/d/x')).toBe(true);
    expect(isValidResourceLink('http://mega.nz/file/x')).toBe(true);
  });

  it('rejects empty or garbage values', () => {
    expect(isValidResourceLink('')).toBe(false);
    expect(isValidResourceLink('   ')).toBe(false);
    expect(isValidResourceLink('nimp')).toBe(false);
    expect(isValidResourceLink('ftp://files.example.com/a')).toBe(false);
  });
});

describe('validateProposal', () => {
  it('requires filière and année', () => {
    expect(validateProposal('https://a.com/x', null, { filiere: '', annee: '1ère année' }).reason).toBe('missing-meta');
    expect(validateProposal('https://a.com/x', null, { filiere: 'MP', annee: '' }).reason).toBe('missing-meta');
  });

  it('requires a valid link or a PDF', () => {
    expect(validateProposal('', null, { filiere: 'MP', annee: '1ère année' }).reason).toBe('missing');
    expect(validateProposal('nimp', null, { filiere: 'MP', annee: '1ère année' }).reason).toBe('invalid-link');
    expect(validateProposal('https://drive.google.com/x', null, { filiere: 'MP', annee: '1ère année' }).ok).toBe(true);
  });
});
