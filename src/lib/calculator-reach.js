/** Reachability tiers for the score calculator (threshold-based). */

export const REACH_TIER_LABEL = {
  probable: 'Probable',
  incertain: 'Incertain',
  impossible: 'Hors de portée',
};

export const REACH_TIER_ORDER = { probable: 0, incertain: 1, impossible: 2 };

export function computeTier(rank, seuil) {
  if (typeof seuil !== 'number') return null;
  if (rank > seuil) return 'impossible';
  if (rank <= seuil * 0.8) return 'probable';
  return 'incertain';
}

export function buildReachRows(programmes, estimatedRank) {
  return programmes
    .filter((p) => p.capacite && typeof p.rang === 'number')
    .map((p) => ({
      inst: p.institution,
      spec: p.filiere,
      seuil: p.rang,
      cap: p.capacite,
      tier: computeTier(estimatedRank, p.rang),
    }));
}

export function filterSortReachRows(rows, search = '') {
  const term = search.trim().toLowerCase();
  return rows
    .filter((r) => !term || r.inst.toLowerCase().includes(term) || r.spec.toLowerCase().includes(term))
    .sort((a, b) => (REACH_TIER_ORDER[a.tier] - REACH_TIER_ORDER[b.tier]) || (a.seuil - b.seuil));
}
