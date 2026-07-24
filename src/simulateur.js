// Simulateur de rang — "avec mon rang, quelles filières ?"
// Uses Prep'Up's own data: rangs 2024 (min/max admitted) + capacités 2025.
import data from './data/rangs_2024_capacites_2025.json' with { type: 'json' };

const TRACKS = ['MP', 'PC', 'PT', 'BG'];
const TRACK_LABEL = { MP: 'MP', PC: 'PC', PT: 'PT (T)', BG: 'BG' };

// Flatten to one row per (program × selected track) at render time.
const PROGRAMMES = (data.programmes || []).map((p) => ({
  inst: p.institution,
  spec: p.filiere,
  MP: p.MP, PC: p.PC, PT: p.PT, BG: p.BG,
  r2025: p.r2025 || null,
}));

const TIER_LABEL = {
  sur: 'Sûr',
  probable: 'Probable',
  limite: 'Limite',
  impossible: 'Hors de portée',
};
const state = {
  track: 'MP',
  year: '2024', // ranks reference year: '2024' | '2025'
  rank: null,
  tier: 'accessibles', // all | accessibles | sur | probable | limite | impossible
  inst: 'all',
  sort: 'proximite', // proximite | selectivite | places
  search: '',
  wishlist: [], // [{inst, spec}]
};

// ---- reachability tier from a rank vs last year's admitted band ----
function tierFor(rank, rmin, rmax) {
  if (typeof rmax !== 'number' || rmax <= 0) return null; // track not open / no data
  if (typeof rmin !== 'number') rmin = rmax;
  if (rank <= rmin) return 'sur';        // better than everyone admitted last year
  if (rank <= rmax) return 'probable';   // within last year's admitted range
  return 'impossible';                   // beyond the last admitted rank
}

// ---- element refs (created in calculateur.html) ----
let elControls, elSummary, elList, elTable, elWishlist;

function q(id) { return document.getElementById(id); }

function numOrNull(v) { return typeof v === 'number' ? v : null; }

// rank band [min, max] for a program in a given year
function bandFor(p, year) {
  if (year === '2025') {
    const r = p.r2025 && p.r2025[state.track];
    return r ? [numOrNull(r[0]), numOrNull(r[1])] : [null, null];
  }
  const d = p[state.track];
  return [d ? numOrNull(d.rang_min) : null, d ? numOrNull(d.rang_max) : null];
}

// compute one display row for the current track / year / rank
function computeRow(p) {
  const d = p[state.track];
  const cap = d && typeof d.capacite === 'number' ? d.capacite : 0;
  const b24 = bandFor(p, '2024');
  const b25 = bandFor(p, '2025');
  let rmin, rmax;
  if (state.year === 'both') {
    const mins = [b24[0], b25[0]].filter((x) => x != null);
    const maxs = [b24[1], b25[1]].filter((x) => x != null);
    rmin = mins.length ? Math.min(...mins) : null;
    rmax = maxs.length ? Math.max(...maxs) : null;
  } else {
    [rmin, rmax] = state.year === '2025' ? b25 : b24;
  }
  const tier = state.rank != null ? tierFor(state.rank, rmin, rmax) : null;
  const margin = state.rank != null && typeof rmax === 'number' ? rmax - state.rank : null;
  return { inst: p.inst, spec: p.spec, cap, rmin, rmax, tier, margin, open: cap > 0, b24, b25 };
}

function currentRows() {
  return PROGRAMMES.map(computeRow).filter((r) => r.open);
}

function bandTxt(b) {
  if (!b || b[1] == null) return null;
  return (b[0] != null && b[0] !== b[1]) ? `${b[0]}–${b[1]}` : `${b[1]}`;
}

// shared meta line: "15 places · rang 355–718 · +717" (or both years)
function formatMeta(r) {
  const parts = [`${r.cap} places`];
  if (state.year === 'both') {
    parts.push(`2024: ${bandTxt(r.b24) || '—'}`);
    parts.push(`2025: ${bandTxt(r.b25) || '—'}`);
  } else {
    parts.push(r.rmax == null ? `rang ${state.year} —` : `rang ${bandTxt([r.rmin, r.rmax])}`);
  }
  if (state.rank != null && typeof r.margin === 'number') {
    parts.push(r.margin >= 0 ? `+${r.margin}` : `${r.margin}`);
  }
  return parts.join(' · ');
}

function tierPass(tier) {
  if (state.tier === 'all') return true;
  if (state.tier === 'accessibles') return tier === 'sur' || tier === 'probable' || tier === 'limite';
  return tier === state.tier;
}

function filteredSortedRows() {
  const term = (state.search || '').trim().toLowerCase();
  let rows = currentRows().filter((r) => {
    if (state.inst !== 'all' && r.inst !== state.inst) return false;
    if (term && !(r.inst.toLowerCase().includes(term) || r.spec.toLowerCase().includes(term))) return false;
    if (state.rank != null && !tierPass(r.tier)) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (state.sort === 'nom') return a.inst.localeCompare(b.inst) || (a.rmax || 1e9) - (b.rmax || 1e9);
    if (state.sort === 'places') return b.cap - a.cap;
    if (state.sort === 'selectivite') return (a.rmax || 1e9) - (b.rmax || 1e9);
    // proximité: closest to my rank first, by |margin| only (tier is not a tiebreaker)
    if (state.rank == null) return (a.rmax || 1e9) - (b.rmax || 1e9);
    const ma = a.margin == null ? 1e9 : Math.abs(a.margin);
    const mb = b.margin == null ? 1e9 : Math.abs(b.margin);
    return ma - mb;
  });
  return rows;
}

// ---- build the controls once ----
function buildControls() {
  elControls.innerHTML = '';

  // Track buttons
  const trackWrap = document.createElement('div');
  trackWrap.className = 'sim-track';
  TRACKS.forEach((t) => {
    const b = document.createElement('button');
    b.textContent = TRACK_LABEL[t];
    b.className = t === state.track ? 'active' : '';
    b.addEventListener('click', () => {
      state.track = t;
      state.inst = 'all';
      buildControls();
      render();
    });
    trackWrap.appendChild(b);
  });

  // Rank input
  const rankWrap = document.createElement('div');
  rankWrap.className = 'sim-rank-row';
  const rankLabel = document.createElement('label');
  rankLabel.textContent = 'Ton rang';
  rankLabel.htmlFor = 'sim-rank-input';
  const rankInput = document.createElement('input');
  rankInput.type = 'number';
  rankInput.id = 'sim-rank-input';
  rankInput.min = '1';
  rankInput.placeholder = 'ex. 850';
  rankInput.inputMode = 'numeric';
  if (state.rank != null) rankInput.value = state.rank;
  rankInput.addEventListener('input', () => {
    const v = parseInt(rankInput.value, 10);
    state.rank = (!isNaN(v) && v > 0) ? v : null;
    render();
  });
  rankWrap.appendChild(rankLabel);
  rankWrap.appendChild(rankInput);

  // Année de référence des rangs (chips)
  const yearField = makeChips('Rangs de référence', [
    ['2024', '2024'],
    ['2025', '2025'],
    ['both', '2024 + 2025'],
  ], state.year, (v) => { state.year = v; buildControls(); render(); });

  // Probabilité (chips)
  const tierField = makeChips('Probabilité', [
    ['all', 'Tous'],
    ['accessibles', 'Accessibles'],
    ['sur', 'Sûr'],
    ['probable', 'Probable'],
    ['impossible', 'Hors de portée'],
  ], state.tier, (v) => { state.tier = v; buildControls(); render(); });

  // Université (custom themed dropdown)
  const insts = Array.from(new Set(currentRows().map((r) => r.inst))).sort();
  const instField = makeDropdown('Université',
    [['all', 'Toutes les universités']].concat(insts.map((i) => [i, shortInst(i)])),
    state.inst, (v) => { state.inst = v; buildControls(); render(); });

  // Trier (chips)
  const sortField = makeChips('Trier', [
    ['proximite', 'Proche de mon rang'],
    ['selectivite', 'Sélectivité'],
    ['places', 'Nombre de places'],
    ['nom', 'Université (A→Z)'],
  ], state.sort, (v) => { state.sort = v; buildControls(); render(); });

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'sim-search';
  searchInput.placeholder = 'Rechercher une école ou une spécialité...';
  searchInput.value = state.search;
  searchInput.addEventListener('input', () => { state.search = searchInput.value; render(); });

  elControls.appendChild(trackWrap);
  elControls.appendChild(rankWrap);
  elControls.appendChild(yearField);
  elControls.appendChild(tierField);
  elControls.appendChild(instField);
  elControls.appendChild(sortField);
  elControls.appendChild(searchInput);
}

function makeChips(labelText, options, current, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'sim-field';
  const label = document.createElement('span');
  label.className = 'sim-field-label';
  label.textContent = labelText;
  const chips = document.createElement('div');
  chips.className = 'sim-chips';
  options.forEach(([val, txt]) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'sim-chip' + (val === current ? ' active' : '');
    c.textContent = txt;
    c.addEventListener('click', () => onChange(val));
    chips.appendChild(c);
  });
  wrap.appendChild(label);
  wrap.appendChild(chips);
  return wrap;
}

let _openDD = null;
function closeAllDropdowns() {
  if (_openDD) { _openDD.classList.remove('open'); _openDD = null; }
}
function makeDropdown(labelText, options, current, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'sim-field';
  const label = document.createElement('span');
  label.className = 'sim-field-label';
  label.textContent = labelText;

  const dd = document.createElement('div');
  dd.className = 'sim-dropdown';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sim-dd-btn';
  const curTxt = (options.find((o) => o[0] === current) || options[0])[1];
  const txtSpan = document.createElement('span');
  txtSpan.textContent = curTxt;
  const caret = document.createElement('span');
  caret.className = 'sim-dd-caret';
  caret.textContent = '▾';
  btn.appendChild(txtSpan);
  btn.appendChild(caret);

  const panel = document.createElement('div');
  panel.className = 'sim-dd-panel';
  options.forEach(([val, txt]) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'sim-dd-option' + (val === current ? ' active' : '');
    opt.textContent = txt;
    opt.addEventListener('click', (e) => { e.stopPropagation(); closeAllDropdowns(); onChange(val); });
    panel.appendChild(opt);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dd.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) { dd.classList.add('open'); _openDD = dd; }
  });

  dd.appendChild(btn);
  dd.appendChild(panel);
  wrap.appendChild(label);
  wrap.appendChild(dd);
  return wrap;
}

function shortInst(full) {
  const m = full.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : full;
}

function inWishlist(r) {
  return state.wishlist.some((w) => w.inst === r.inst && w.spec === r.spec);
}

// ---- render dynamic parts ----
function render() {
  renderSummary();
  renderList();
  renderTable();
  renderWishlist();
}

function renderSummary() {
  if (!elSummary) return;
  if (state.rank == null) {
    elSummary.innerHTML = '<span class="sim-hint">Entre ton rang pour voir les filières accessibles.</span>';
    return;
  }
  const rows = currentRows();
  const acc = rows.filter((r) => ['sur', 'probable', 'limite'].includes(r.tier));
  const totalSpots = acc.reduce((s, r) => s + r.cap, 0);
  elSummary.innerHTML =
    `Rang <strong>${state.rank}</strong> en <strong>${TRACK_LABEL[state.track]}</strong> — ` +
    `<strong>${acc.length}</strong> programmes potentiellement accessibles (${totalSpots} places).`;
}

function renderList() {
  const rows = filteredSortedRows();
  elList.innerHTML = '';
  if (rows.length === 0) {
    elList.innerHTML = '<div class="reach-empty">Aucun programme ne correspond.</div>';
    return;
  }
  for (const r of rows) {
    const item = document.createElement('div');
    item.className = 'sim-item';

    const badge = document.createElement('span');
    badge.className = `tier-badge ${r.tier || 'na'}`;
    badge.textContent = state.rank == null ? '—' : (r.tier ? TIER_LABEL[r.tier] : 'Rang N/A');

    const name = document.createElement('span');
    name.className = 'sim-name';
    name.textContent = `${shortInst(r.inst)} — ${r.spec}`;

    const meta = document.createElement('span');
    meta.className = 'sim-meta';
    meta.textContent = formatMeta(r);

    const add = document.createElement('button');
    add.className = 'sim-add' + (inWishlist(r) ? ' added' : '');
    add.textContent = inWishlist(r) ? '✓' : '+';
    add.title = inWishlist(r) ? 'Retirer de mes vœux' : 'Ajouter à mes vœux';
    add.addEventListener('click', () => {
      if (inWishlist(r)) state.wishlist = state.wishlist.filter((w) => !(w.inst === r.inst && w.spec === r.spec));
      else state.wishlist.push({ inst: r.inst, spec: r.spec });
      renderList();
      renderWishlist();
    });

    item.appendChild(badge);
    item.appendChild(name);
    item.appendChild(meta);
    item.appendChild(add);
    elList.appendChild(item);
  }
}

function renderTable() {
  if (!elTable) return;
  const rows = currentRows().slice().sort((a, b) => a.inst.localeCompare(b.inst) || (a.rmax || 1e9) - (b.rmax || 1e9));
  if (rows.length === 0) { elTable.innerHTML = ''; return; }
  let html = '<table class="sim-table"><thead><tr><th>École</th><th>Filière</th><th>Places</th><th>Rang min–max</th></tr></thead><tbody>';
  for (const r of rows) {
    html += `<tr><td>${shortInst(r.inst)}</td><td>${r.spec}</td><td>${r.cap}</td><td>${r.rmax == null ? '—' : (r.rmin != null ? r.rmin + '–' + r.rmax : r.rmax)}</td></tr>`;
  }
  html += '</tbody></table>';
  elTable.innerHTML = html;
}

function renderWishlist() {
  if (!elWishlist) return;
  if (state.wishlist.length === 0) {
    elWishlist.innerHTML = '<div class="sim-wishlist-empty">Ta liste de vœux est vide. Ajoute des programmes avec le bouton +.</div>';
    return;
  }
  let covered = 0;
  let html = '<div class="sim-wishlist-title">Mes vœux (dans l\'ordre)</div><ol class="sim-wishlist">';
  state.wishlist.forEach((w, i) => {
    const p = PROGRAMMES.find((x) => x.inst === w.inst && x.spec === w.spec);
    const r = p ? computeRow(p) : { cap: 0 };
    covered += r.cap;
    html += `<li><span class="wl-order">${i + 1}</span><span class="wl-name">${shortInst(w.inst)} — ${w.spec}</span><span class="wl-meta">${p ? formatMeta(r) : '—'}</span>` +
            `<span class="wl-moves"><button class="wl-mv" data-dir="up" data-i="${i}" title="Monter"${i === 0 ? ' disabled' : ''}>↑</button>` +
            `<button class="wl-mv" data-dir="down" data-i="${i}" title="Descendre"${i === state.wishlist.length - 1 ? ' disabled' : ''}>↓</button></span>` +
            `<button class="wl-rm" data-i="${i}" title="Retirer">✕</button></li>`;
  });
  html += '</ol>';
  html += `<div class="sim-wishlist-cov"><strong>${state.wishlist.length}</strong> vœux · <strong>${covered}</strong> places couvertes</div>`;
  elWishlist.innerHTML = html;
  elWishlist.querySelectorAll('.wl-rm').forEach((b) => {
    b.addEventListener('click', () => {
      const i = parseInt(b.dataset.i, 10);
      state.wishlist.splice(i, 1);
      renderList();
      renderWishlist();
    });
  });
  elWishlist.querySelectorAll('.wl-mv').forEach((b) => {
    b.addEventListener('click', () => {
      const i = parseInt(b.dataset.i, 10);
      const j = b.dataset.dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= state.wishlist.length) return;
      const arr = state.wishlist;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      renderWishlist();
    });
  });
}

// ---- tab switching + auto-fill from the score calculator ----
function setupTabs() {
  const bar = document.getElementById('calc-tabs');
  const tabScore = document.getElementById('tab-score');
  const tabRang = document.getElementById('tab-rang');
  if (!bar || !tabScore || !tabRang) return;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    const t = b.dataset.tab;
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    tabScore.classList.toggle('active', t === 'score');
    tabRang.classList.toggle('active', t === 'rang');
    if (t === 'rang') {
      autofillFromCalculator();
      buildControls();
      render();
    }
  });
}

function autofillFromCalculator() {
  const info = window.__prepupRank;
  if (info && typeof info.rank === 'number') {
    // only overwrite if the user hasn't typed their own rank yet
    if (state.rank == null) state.rank = info.rank;
    if (info.filiere) state.track = info.filiere === 'T' ? 'PT' : info.filiere;
  }
}

function init() {
  elControls = q('sim-controls');
  elSummary = q('sim-summary');
  elList = q('sim-list');
  elTable = q('sim-table');
  elWishlist = q('sim-wishlist');
  if (!elControls) return;
  document.addEventListener('click', closeAllDropdowns);
  setupTabs();
  const goBtn = document.getElementById('go-simulateur');
  if (goBtn) goBtn.addEventListener('click', () => {
    const info = window.__prepupRank;
    if (info && typeof info.rank === 'number') {
      state.rank = info.rank; // force the freshly calculated rank (overwrite)
      if (info.filiere) state.track = info.filiere === 'T' ? 'PT' : info.filiere;
    }
    const rangTab = document.querySelector('#calc-tabs button[data-tab="rang"]');
    if (rangTab) rangTab.click();
  });
  autofillFromCalculator();
  buildControls();
  render();
}

init();
