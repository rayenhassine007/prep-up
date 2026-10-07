// Annonce à IndexNow (Bing, Yandex, Seznam, Naver…) les pages modifiées.
//
//   node scripts/indexnow.mjs                 pages touchées depuis le commit parent
//   node scripts/indexnow.mjs --depuis <sha>  pages touchées depuis <sha>
//   node scripts/indexnow.mjs --tout          toutes les pages du sitemap
//   ajouter --essai pour afficher sans rien envoyer
//
// Lancé automatiquement par .github/workflows/indexnow.yml après chaque
// déploiement de production réussi sur Vercel.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDEXNOW_KEY, SITE, corpsIndexNow, urlsDuSitemap, urlsModifiees } from './indexnow-logic.mjs';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const essai = args.includes('--essai');
const tout = args.includes('--tout');
const iDepuis = args.indexOf('--depuis');
const depuis = iDepuis >= 0 ? args[iDepuis + 1] : 'HEAD~1';

const sitemap = urlsDuSitemap(readFileSync(resolve(racine, 'public/sitemap.xml'), 'utf8'));

let urls;
if (tout) {
  urls = sitemap;
} else {
  const fichiers = execFileSync('git', ['diff', '--name-only', `${depuis}..HEAD`], { cwd: racine, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  console.log(`Fichiers modifiés depuis ${depuis} : ${fichiers.length}`);
  urls = urlsModifiees(fichiers, sitemap);
}

if (!urls.length) {
  console.log('Aucune page publique modifiée : rien à annoncer.');
  process.exit(0);
}
console.log(`Pages à annoncer (${urls.length}) :\n  ${urls.join('\n  ')}`);
if (essai) process.exit(0);

// IndexNow refuse l'envoi si le fichier de clé n'est pas en ligne : on le
// vérifie d'abord pour avoir un message clair.
const cle = await fetch(`${SITE}/${INDEXNOW_KEY}.txt`);
const contenu = cle.ok ? (await cle.text()).trim() : '';
if (contenu !== INDEXNOW_KEY) {
  console.error(`Fichier de clé introuvable ou incorrect sur ${SITE}/${INDEXNOW_KEY}.txt (HTTP ${cle.status}).`);
  process.exit(1);
}

const rep = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(corpsIndexNow(urls)),
});
// 200 : reçu ; 202 : reçu, clé en cours de validation (premier envoi).
if (rep.status === 200 || rep.status === 202) {
  console.log(`IndexNow : HTTP ${rep.status}, ${urls.length} page(s) annoncée(s).`);
} else {
  console.error(`IndexNow a refusé l'envoi : HTTP ${rep.status} ${await rep.text()}`);
  process.exit(1);
}
