// scripts/prerender.mjs
//
// Runs after `vite build`. Injects real, crawlable HTML for the default view
// of the data-driven pages (places-2026.html, ressources.html,
// chapitres-concours.html) directly into dist/*.html, using the exact same JSON
// data the client-side JS uses.
//
// Why: these pages normally render their content entirely in the browser
// (empty <div id="..."></div> filled by JS after load). That's invisible to
// a fast/first-pass crawl and thin even after render. This script seeds the
// same containers with the default-state markup at build time. The existing
// client JS still runs on load and rebuilds the same content on top
// (progressive enhancement) — filtering/search still work exactly as before,
// nothing about the interactive behavior changes.
//
// To update: this script mirrors the render logic in src/places.js,
// src/ressources.js and src/chapitres.js. If you change how those render lists,
// mirror the change here too.
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

// Deliberate divergence #2: the static copy of chapitres-concours.html carries
// all four épreuves stacked, where the client shows one at a time behind the
// "Épreuves" buttons. A crawler (and a reader with JS off) then gets the whole
// dataset instead of a quarter of it; the client replaces the block on load.
function buildChapitres() {
  const data = JSON.parse(readFileSync(resolve(root, 'src/data/chapitres_concours_mp.json'), 'utf8'));
  const BANDES = {
    'incontournable': 'b-incontournable',
    'très régulier': 'b-tres-regulier',
    'régulier': 'b-regulier',
    'variable': 'b-variable',
    'rare': 'b-rare',
    'jamais rencontré': 'b-jamais',
  };
  const epreuves = Object.entries(data.epreuves)
    .sort((a, b) => b[1].coefficient - a[1].coefficient);

  const tabsHtml = epreuves.map(([, e], i) =>
    `<button type="button" class="chap-tab${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}">` +
    `<span class="chap-tab-name">${esc(e.court)}</span>` +
    `<span class="chap-tab-coef">coef ${esc(e.coefficient)}</span></button>`
  ).join('');

  // Mirrors propre()/sansDoublons()/sessionYears() in src/chapitres.js.
  const ANNEE_SUFFIXE = /\s*\((?:1re|1ère|2e|2ème)\s+ann[ée]e\)/g;
  const propre = (s) => String(s ?? '').replace(ANNEE_SUFFIXE, '');
  const nomDe = (c) => propre(c.sous_chapitre || c.chapitre);
  const sansDoublons = (chapitres) => {
    const vus = new Set();
    return chapitres.filter((c) => {
      const cle = `${nomDe(c)}|${c.sessions_ou_present}|${c.regularite}|${propre(c.chapitre_parent)}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
  };

  const sessionYears = (e) => {
    const m = String(e.annees || '').match(/(\d{4})\s*[–—-]\s*(\d{4})/);
    if (!m) return null;
    const years = [];
    for (let y = Number(m[1]); y <= Number(m[2]); y++) years.push(y);
    return years.length === e.sessions_analysees ? years : null;
  };

  const row = (c, e) => {
    const nom = nomDe(c);
    const band = BANDES[c.regularite] || 'b-rare';
    const pct = c.sessions_analysees ? (c.sessions_ou_present / c.sessions_analysees) * 100 : 0;
    const parent = e.niveau === 'sous-chapitre' && c.chapitre_parent
      ? `<span class="chap-sub"><span class="chap-parent">${esc(propre(c.chapitre_parent))}</span></span>` : '';

    const years = sessionYears(e);
    const set = Array.isArray(c.sessions_presentes) ? new Set(c.sessions_presentes.map(Number)) : null;
    // The per-session panel is emitted open: with JS off the toggle is inert,
    // so hiding it would hide the years from a crawler for no gain. The client
    // collapses it when it re-renders.
    const detail = years && set && years.some((y) => set.has(y))
      ? `<button type="button" class="chap-toggle" aria-expanded="true" aria-label="Voir les sessions de « ${esc(nom)} »">▾</button>` +
        `<div class="chap-detail"><div class="chap-detail-title">Sessions où le chapitre a été rencontré</div>` +
        `<div class="chap-years">` +
        years.map((y) => {
          const on = set.has(y);
          return `<div class="chap-year${on ? ' is-on' : ''}" aria-label="${y} : ${on ? 'rencontré' : 'non rencontré'}">` +
            `<span class="cy-mark" aria-hidden="true">${on ? '✓' : '–'}</span>` +
            `<span class="cy-num">${y}</span></div>`;
        }).join('') +
        `</div></div>`
      : '';

    return `<div class="chap-item">` +
      `<div class="chap-main"><span class="chap-name">${esc(nom)}</span>${parent}</div>` +
      `<span class="chap-count">${esc(c.sessions_ou_present)}/${esc(c.sessions_analysees)}</span>` +
      `<span class="freq-badge ${band}">${esc(c.regularite)}</span>` +
      `<div class="chap-bar" aria-hidden="true"><span class="chap-bar-fill ${band}" style="width:${pct}%"></span></div>` +
      detail +
      `</div>`;
  };

  const panelHtml = epreuves.map(([, e]) => {
    const chips = [
      `coefficient ${e.coefficient}`,
      `${e.sessions_analysees} sessions (${e.annees})`,
      `seuil de présence : ≥ ${e.seuil_presence_questions} question${e.seuil_presence_questions > 1 ? 's' : ''}`,
    ].map((b) => `<span class="chap-chip">${esc(b)}</span>`).join('');

    const vus = sansDoublons(e.chapitres.filter((c) => c.sessions_ou_present > 0));
    const jamais = sansDoublons(e.chapitres.filter((c) => c.sessions_ou_present === 0));
    const neverHtml = jamais.length
      ? `<details class="chap-never"><summary>Voir les ${jamais.length} chapitre${jamais.length > 1 ? 's' : ''} jamais rencontré${jamais.length > 1 ? 's' : ''}</summary>` +
        `<div class="chap-list">${jamais.map((c) => row(c, e)).join('')}</div></details>`
      : '';

    return `<section class="chap-card"><div class="chap-head"><h2 class="chap-title">${esc(e.epreuve)}</h2>` +
      `<div class="chap-meta">${chips}</div></div>` +
      `<div class="chap-list">${vus.map((c) => row(c, e)).join('')}</div>${neverHtml}</section>`;
  }).join('');

  return { tabsHtml, panelHtml };
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
  const chapitresPath = resolve(dist, 'chapitres-concours.html');
  if (existsSync(chapitresPath)) {
    let html = readFileSync(chapitresPath, 'utf8');
    const { tabsHtml, panelHtml } = buildChapitres();
    html = injectInto(html, 'chap-tabs', tabsHtml);
    html = injectInto(html, 'chap-panel', panelHtml);
    writeFileSync(chapitresPath, html);
    console.log('[prerender] chapitres-concours.html: injected static content.');
  }
}

run();
