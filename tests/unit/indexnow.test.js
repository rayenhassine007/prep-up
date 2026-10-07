import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXNOW_KEY, corpsIndexNow, urlsDuSitemap, urlsModifiees } from '../../scripts/indexnow-logic.mjs';

const racine = resolve(__dirname, '../..');
const sitemap = urlsDuSitemap(readFileSync(resolve(racine, 'public/sitemap.xml'), 'utf8'));
const S = 'https://prep-upp.com';

describe('IndexNow', () => {
  it('publishes the key file at the site root, with the key as its only content', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    const fichier = resolve(racine, `public/${INDEXNOW_KEY}.txt`);
    expect(existsSync(fichier)).toBe(true);
    expect(readFileSync(fichier, 'utf8')).toBe(INDEXNOW_KEY);
  });

  it('reads every page of the sitemap', () => {
    expect(sitemap).toContain(`${S}/`);
    expect(sitemap).toContain(`${S}/apprendre-a-apprendre`);
    expect(sitemap).toHaveLength(6);
  });

  it('maps each page file to its own URL', () => {
    expect(urlsModifiees(['src/data/ressources.json'], sitemap)).toEqual([`${S}/ressources`]);
    expect(urlsModifiees(['public/sources/tp.pdf', 'index.html'], sitemap)).toEqual([`${S}/`, `${S}/ressources`]);
    expect(urlsModifiees(['src/lib/apprendre-i18n.js'], sitemap)).toEqual([`${S}/apprendre-a-apprendre`]);
    expect(urlsModifiees(['src/data/chapitres_concours_mp.json'], sitemap)).toEqual([`${S}/chapitres-concours`]);
    expect(urlsModifiees(['src/data/distribution_moyennes_2025.json'], sitemap)).toEqual([`${S}/calculateur`]);
    expect(urlsModifiees(['src/data/places2026.json'], sitemap)).toEqual([`${S}/places-2026`]);
  });

  it('announces every page when a shared file changes', () => {
    expect(urlsModifiees(['src/styles/main.css'], sitemap)).toEqual(sitemap);
    expect(urlsModifiees(['src/feedback.js'], sitemap)).toEqual(sitemap);
  });

  it('ignores tests, docs and tooling', () => {
    expect(urlsModifiees(['tests/unit/rank.test.js', 'README.md', '.github/workflows/indexnow.yml', 'scripts/indexnow.mjs'], sitemap)).toEqual([]);
  });

  it('builds the request IndexNow expects', () => {
    expect(corpsIndexNow([`${S}/`])).toEqual({
      host: 'prep-upp.com',
      key: INDEXNOW_KEY,
      keyLocation: `${S}/${INDEXNOW_KEY}.txt`,
      urlList: [`${S}/`],
    });
  });
});
