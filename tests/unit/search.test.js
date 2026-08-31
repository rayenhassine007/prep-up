import { describe, expect, it } from 'vitest';
import { normalizeText } from '../../src/search.js';

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('Algèbre')).toBe('algebre');
    expect(normalizeText('Ingénieurs')).toBe('ingenieurs');
  });

  it('unifies apostrophe styles', () => {
    expect(normalizeText("d'Ingénieurs")).toBe(normalizeText('d’Ingénieurs'));
  });

  it('handles nullish input', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});
