import { describe, expect, it } from 'vitest';
import {
  DELAI_ENVOI_MS,
  MAX_MESSAGE,
  MIN_MESSAGE,
  TYPES,
  clePage,
  contexte,
  estAccueil,
  estType,
  peutEnvoyer,
  urlSansPisteurs,
  validerRetour,
} from '../../src/lib/feedback-logic.js';

describe('TYPES', () => {
  it('names every type once, with a label', () => {
    const cles = TYPES.map(([c]) => c);
    expect(cles).toEqual([...new Set(cles)]);
    for (const [cle, libelle] of TYPES) {
      expect(cle).toMatch(/^[a-z]+$/);
      expect(libelle.length).toBeGreaterThan(0);
      expect(libelle).not.toMatch(/—/);
    }
  });

  it('recognises only its own keys', () => {
    expect(estType(TYPES[0][0])).toBe(true);
    expect(estType('spam')).toBe(false);
    expect(estType(undefined)).toBe(false);
  });
});

describe('validerRetour', () => {
  const type = TYPES[0][0];

  it('accepts a real message and trims it', () => {
    const r = validerRetour({ type, message: '  Ajoutez la filière PT svp  ' });
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Ajoutez la filière PT svp');
  });

  it('refuses an unknown type', () => {
    expect(validerRetour({ type: 'autre-chose', message: 'x'.repeat(50) }))
      .toEqual({ ok: false, raison: 'type' });
  });

  it('refuses a message too short to act on', () => {
    expect(validerRetour({ type, message: 'nul' }).raison).toBe('court');
    // des espaces ne font pas une longueur
    expect(validerRetour({ type, message: ' '.repeat(MIN_MESSAGE + 5) }).raison).toBe('court');
    expect(validerRetour({ type, message: undefined }).raison).toBe('court');
  });

  it('refuses a message past the cap', () => {
    expect(validerRetour({ type, message: 'a'.repeat(MAX_MESSAGE) }).ok).toBe(true);
    expect(validerRetour({ type, message: 'a'.repeat(MAX_MESSAGE + 1) }).raison).toBe('long');
  });
});

describe('peutEnvoyer', () => {
  it('lets a first message through', () => {
    expect(peutEnvoyer(1000, null)).toBe(true);
    expect(peutEnvoyer(1000, NaN)).toBe(true);
    expect(peutEnvoyer(1000, 0)).toBe(true);
  });

  it('holds a second message inside the window', () => {
    const t = 10_000_000;
    expect(peutEnvoyer(t + DELAI_ENVOI_MS - 1, t)).toBe(false);
    expect(peutEnvoyer(t + DELAI_ENVOI_MS, t)).toBe(true);
  });

  // Une horloge qui recule ne doit pas enfermer quelqu'un hors du formulaire.
  it('lets through when the clock went backwards', () => {
    expect(peutEnvoyer(1000, 9_999_999)).toBe(true);
  });
});

describe('contexte', () => {
  it('joins only the parts it actually has', () => {
    expect(contexte({ url: '/chapitres-concours', filiere: 'BG', epreuve: 'Chimie orga.', largeur: 390 }))
      .toBe('/chapitres-concours | filière BG | épreuve Chimie orga. | 390 px');
    expect(contexte({ url: '/calculateur' })).toBe('/calculateur');
    expect(contexte({})).toBe('');
  });
});

describe('clePage', () => {
  it('gives one key per page, whatever the URL shape', () => {
    expect(clePage('/ressources')).toBe(clePage('/ressources.html'));
    expect(clePage('/ressources/')).toBe(clePage('/ressources'));
    expect(clePage('/')).toBe('pu-avis:/');
    expect(clePage('')).toBe('pu-avis:/');
    expect(clePage('/calculateur')).not.toBe(clePage('/ressources'));
  });
});

describe('estAccueil', () => {
  it('recognises the homepage whatever the URL shape', () => {
    for (const p of ['/', '', '/index.html', '//']) {
      expect(estAccueil(p)).toBe(true);
    }
  });

  it('leaves the tools alone', () => {
    for (const p of ['/calculateur', '/ressources.html', '/chapitres-concours/', '/places-2026']) {
      expect(estAccueil(p)).toBe(false);
    }
  });
});

describe('urlSansPisteurs', () => {
  it('drops click ids so the rest of the context stays readable', () => {
    expect(urlSansPisteurs('/ressources', '?fbclid=IwZXh0bgNhZW0CMTEAAR2abc')).toBe('/ressources');
    expect(urlSansPisteurs('/ressources', '?utm_source=fb&utm_medium=social&gclid=x')).toBe('/ressources');
  });

  it('keeps the parameters that describe the page', () => {
    expect(urlSansPisteurs('/chapitres-concours', '?filiere=MP&fbclid=abc')).toBe('/chapitres-concours?filiere=MP');
  });

  it('handles an empty query string', () => {
    expect(urlSansPisteurs('/calculateur', '')).toBe('/calculateur');
    expect(urlSansPisteurs('', undefined)).toBe('/');
  });
});

describe('contexte et navigateur intégré', () => {
  it('names the in-app browser when there is one', () => {
    expect(contexte({ url: '/ressources', largeur: 390, appli: 'Facebook' }))
      .toBe('/ressources | 390 px | navigateur Facebook');
    expect(contexte({ url: '/ressources', largeur: 390, appli: null })).toBe('/ressources | 390 px');
  });
});
