// scripts/prerender.mjs
//
// Runs after `vite build`. Injects real, crawlable HTML for the default view
// of the data-driven pages (places-2026.html, ressources.html) directly into
// dist/*.html, using the exact same JSON data the client-side JS uses.
//
// Why: these pages normally render their content entirely in the browser
// (empty <div id="..."></div> filled by JS after load). That's invisible to
// a fast/first-pass crawl and thin even after render. This script seeds the
// same containers with the default-state markup at build time. The existing
// client JS still runs on load and rebuilds the same content on top
// (progressive enhancement) — filtering/search still work exactly as before,
// nothing about the interactive behavior changes.
//
// To update: this script mirrors the render logic in src/places.js and
// src/ressources.js. If you change how those render lists, mirror the change
// here too.
//
// Deliberate divergence: the favourite-star buttons on ressources rows are not
// emitted here. They are client-only controls backed by localStorage, so a
// static copy would be inert markup for a crawler. The client adds them when it
// re-renders.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function injectInto(html, elementIdAttr, innerHtml) {
  const re = new RegExp(`(<[a-zA-Z0-9]+[^>]*id="${elementIdAttr}"[^>]*>)(</[a-zA-Z0-9]+>)`);
  if (!re.test(html)) {
    console.warn(`[prerender] Could not find empty container for id="${elementIdAttr}" — skipping.`);
    return html;
  }
  return html.replace(re, `$1${innerHtml}$2`);
}

function buildPlaces() {
  const data = JSON.parse(readFileSync(resolve(root, 'src/data/places2026.json'), 'utf8'));
  const t = data.totaux;
  const totauxHtml = [
    ['MP', t.MP], ['PC', t.PC], ['T', t.T], ['BG', t.BG],
  ].map(([label, num]) =>
    `<div class="stat"><div class="stat-num">${esc(num)}</div><div class="stat-label">places ${esc(label)}</div></div>`
  ).join('');

  const specTotal = (s) => s.MP + s.PC + s.T + s.BG;

  const listHtml = data.ecoles.map((ecole) => {
    const specs = ecole.specialites;
    if (specs.length === 0) return '';
    const ecoleTotal = specs.reduce((acc, s) => acc + specTotal(s), 0);
    const rows = specs.map((s) => {
      const parts = [];
      if (s.MP) parts.push(`MP ${s.MP}`);
      if (s.PC) parts.push(`PC ${s.PC}`);
      if (s.T) parts.push(`T ${s.T}`);
      if (s.BG) parts.push(`BG ${s.BG}`);
      const meta = `${parts.join(' · ')} — Total ${specTotal(s)}`;
      return `<div class="res-item"><span class="res-name">${esc(s.nom)}</span><span class="res-meta">${esc(meta)}</span></div>`;
    }).join('');
    return `<div class="res-group"><div class="res-matiere">${esc(ecole.nom)} — ${ecoleTotal} places</div>${rows}</div>`;
  }).join('');

  return { totauxHtml, listHtml };
}

function buildRessources() {
  const data = JSON.parse(readFileSync(resolve(root, 'src/data/ressources.json'), 'utf8'));
  const filieres = Object.keys(data.filieres);
  const filiere = filieres[0];
  const annee = Object.keys(data.filieres[filiere])[0];
  const groups = data.filieres[filiere][annee] || [];

  const listHtml = groups.map((group) => {
    const items = group.items || [];
    const rows = items.map((item) => {
      const isLive = Boolean(item.url);
      const tag = isLive ? 'a' : 'div';
      const attrs = isLive ? ` href="${esc(item.url)}" target="_blank" rel="noopener"` : '';
      const cls = 'res-item' + (isLive ? ' live' : '');
      const meta = isLive ? (item.type ? item.type + ' ↗' : '↗') : [item.type, 'Bientôt'].filter(Boolean).join(' · ');
      return `<${tag} class="${cls}"${attrs}><span class="res-name">${esc(item.titre)}</span><span class="res-meta">${esc(meta)}</span></${tag}>`;
    }).join('');
    return `<div class="res-group"><div class="res-matiere">${esc(group.matiere)}</div>${rows}</div>`;
  }).join('');

  return { listHtml, filiere, annee };
}

function run() {
  if (!existsSync(dist)) {
    console.warn('[prerender] dist/ not found — run `vite build` first. Skipping.');
    return;
  }
  const placesPath = resolve(dist, 'places-2026.html');
  if (existsSync(placesPath)) {
    let html = readFileSync(placesPath, 'utf8');
    const { totauxHtml, listHtml } = buildPlaces();
    html = injectInto(html, 'totaux', totauxHtml);
    html = injectInto(html, 'places-list', listHtml);
    writeFileSync(placesPath, html);
    console.log('[prerender] places-2026.html: injected static content.');
  }
  const ressourcesPath = resolve(dist, 'ressources.html');
  if (existsSync(ressourcesPath)) {
    let html = readFileSync(ressourcesPath, 'utf8');
    const { listHtml } = buildRessources();
    html = injectInto(html, 'res-list', listHtml);
    writeFileSync(ressourcesPath, html);
    console.log('[prerender] ressources.html: injected static content.');
  }
}

run();
