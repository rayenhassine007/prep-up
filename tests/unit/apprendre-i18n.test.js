import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXTES, morceaux, t } from '../../src/lib/apprendre-i18n.js';

const html = readFileSync(resolve(__dirname, '../../apprendre-a-apprendre.html'), 'utf8');

const decoder = (s) => s
  .replace(/&larr;/g, '←')
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

describe('dictionnaire', () => {
  it('has the same keys in French and Arabic', () => {
    expect(Object.keys(TEXTES.ar).sort()).toEqual(Object.keys(TEXTES.fr).sort());
  });

  it('never uses an em dash', () => {
    for (const langue of ['fr', 'ar']) {
      for (const [cle, texte] of Object.entries(TEXTES[langue])) {
        expect(texte, `${langue} ${cle}`).not.toMatch(/—/);
      }
    }
  });

  it('uses Western digits in Arabic', () => {
    for (const texte of Object.values(TEXTES.ar)) expect(texte).not.toMatch(/[٠-٩]/);
  });

  it('keeps the same markers in both languages', () => {
    for (const cle of Object.keys(TEXTES.fr)) {
      const marques = (s) => (s.match(/\{\w+\}/g) || []).sort();
      expect(marques(TEXTES.ar[cle]), cle).toEqual(marques(TEXTES.fr[cle]));
    }
  });

  it('fills variables and falls back to French', () => {
    expect(t('fr', 'quiz.methode', { n: 4 })).toBe('méthode 4');
    expect(t('ar', 'quiz.methode', { n: 4 })).toBe('الطريقة 4');
    expect(t('ar', 'cle.inconnue')).toBe('cle.inconnue');
  });

  it('splits marked text into pieces', () => {
    expect(morceaux('Voir la {lien}.')).toEqual(['Voir la ', { marqueur: 'lien' }, '.']);
    expect(morceaux('{cours} sur Coursera {lien}')).toEqual([{ marqueur: 'cours' }, ' sur Coursera ', { marqueur: 'lien' }]);
  });
});

describe('page HTML', () => {
  it('only uses keys the dictionary knows', () => {
    const cles = [...html.matchAll(/data-i18n(?:-riche|-aria|-placeholder)?="([^"]+)"/g)].map((m) => m[1]);
    expect(cles.length).toBeGreaterThan(50);
    for (const cle of cles) expect(TEXTES.fr, cle).toHaveProperty([cle]);
  });

  it('writes the same French as the dictionary (what search engines read)', () => {
    for (const [, cle, texte] of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
      expect(decoder(texte), cle).toBe(TEXTES.fr[cle]);
    }
    for (const [, cle, interieur] of html.matchAll(/data-i18n-riche="([^"]+)"[^>]*>(.*?)<\/p>/g)) {
      const lien = html.match(new RegExp(`data-i18n-riche="${cle}"[^>]*data-lien-cle="([^"]+)"`))[1];
      const attendu = TEXTES.fr[cle].replace('{lien}', TEXTES.fr[lien]).replace('{cours}', 'Learning How to Learn');
      expect(decoder(interieur.replace(/<[^>]+>/g, '')), cle).toBe(attendu);
    }
  });

  it('keeps the page short: 7 methods, 5 questions, no FAQ', () => {
    expect(html.match(/class="aa-methode"/g)).toHaveLength(7);
    expect(html.match(/class="aa-q"/g)).toHaveLength(5);
    expect(html).not.toMatch(/FAQPage/);
    expect(html).not.toMatch(/—/);
  });
});
