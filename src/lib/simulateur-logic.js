/** Rank simulator: tier, sort, and filter logic. */

import { normalizeText } from '../search.js';

export const MARGIN_SUR = 200;

export const SIM_TIER_LABEL = {
  sur: 'Sûr',
  probable: 'Probable',
  impossible: 'Hors de portée',
};

export function tierFor(rank, rmax, marginSur = MARGIN_SUR) {
  if (typeof rmax !== 'number' || rmax <= 0) return null;
  const margin = rmax - rank;
  if (margin >= marginSur) return 'sur';
  if (margin >= 0) return 'probable';
  return 'impossible';
}

export function numOrNull(v) {
  return typeof v === 'number' ? v : null;
}

export function bandFor(programme, track, year) {
  if (year === '2025') {
    const r = programme.r2025 && programme.r2025[track];
    return r ? [numOrNull(r[0]), numOrNull(r[1])] : [null, null];
  }
  const d = programme[track];
  return [d ? numOrNull(d.rang_min) : null, d ? numOrNull(d.rang_max) : null];
}

export function computeSimRow(programme, track, year, rank) {
  const d = programme[track];
  const cap = d && typeof d.capacite === 'number' ? d.capacite : 0;
  const b24 = bandFor(programme, track, '2024');
  const b25 = bandFor(programme, track, '2025');
  let rmin;
  let rmax;
  if (year === 'both') {
    const mins = [b24[0], b25[0]].filter((x) => x != null);
    const maxs = [b24[1], b25[1]].filter((x) => x != null);
    rmin = mins.length ? Math.min(...mins) : null;
    rmax = maxs.length ? Math.max(...maxs) : null;
  } else {
    [rmin, rmax] = year === '2025' ? b25 : b24;
  }
  const tier = rank != null ? tierFor(rank, rmax) : null;
  const margin = rank != null && typeof rmax === 'number' ? rmax - rank : null;
  return {
    inst: programme.inst,
    spec: programme.spec,
    cap,
    rmin,
    rmax,
    tier,
    margin,
    open: cap > 0,
    b24,
    b25,
  };
}

export function bandTxt(b) {
  if (!b || b[1] == null) return null;
  return (b[0] != null && b[0] !== b[1]) ? `${b[0]}–${b[1]}` : `${b[1]}`;
}

export function tierPass(tierFilter, tier) {
  if (tierFilter === 'all') return true;
  if (tierFilter === 'accessibles') return tier === 'sur' || tier === 'probable';
  return tier === tierFilter;
}

export function proximiteGroup(row) {
  if (row.margin == null) return 2;
  if (row.margin >= 0) return 0;
  return 1;
}

export function compareProximite(a, b) {
  const ga = proximiteGroup(a);
  const gb = proximiteGroup(b);
  if (ga !== gb) return ga - gb;
  if (ga === 0) return a.margin - b.margin;
  if (ga === 1) return b.margin - a.margin;
  return (a.inst + a.spec).localeCompare(b.inst + b.spec);
}

export function filteredSortedRows(programmes, options) {
  const {
    track,
    year,
    rank,
    tierFilter,
    inst,
    sort,
    search,
  } = options;

  const term = normalizeText((search || '').trim());
  let rows = programmes
    .map((p) => computeSimRow(p, track, year, rank))
    .filter((r) => r.open)
    .filter((r) => {
      if (inst !== 'all' && r.inst !== inst) return false;
      if (term && !(normalizeText(r.inst).includes(term) || normalizeText(r.spec).includes(term))) return false;
      if (rank != null && !tierPass(tierFilter, r.tier)) return false;
      return true;
    });

  rows.sort((a, b) => {
    if (sort === 'nom') return a.inst.localeCompare(b.inst) || (a.rmax || 1e9) - (b.rmax || 1e9);
    if (sort === 'places') return b.cap - a.cap;
    if (rank == null) return (a.rmax || 1e9) - (b.rmax || 1e9);
    return compareProximite(a, b);
  });
  return rows;
}

export function shortInst(full) {
  const m = String(full).match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : full;
}
