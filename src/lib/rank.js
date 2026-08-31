/** Rank estimation from weighted average using session distribution bins. */

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function estimateRank(moyenne, filiere, distribution) {
  const dist = distribution.filieres[filiere];
  if (!dist) return null;
  const bins = dist.bins;
  let idx = Math.floor(moyenne);
  if (idx < 0) idx = 0;
  if (idx > bins.length - 1) idx = bins.length - 1;

  let higher = 0;
  for (let i = idx + 1; i < bins.length; i++) higher += bins[i];

  const withinBin = bins[idx] || 0;
  const positionInBin = moyenne - idx;
  const fractionAbove = withinBin * (1 - positionInBin);

  const rankRaw = Math.max(1, Math.round(higher + fractionAbove + 1));
  const rank = Math.min(rankRaw, dist.classes);
  return { rank, classes: dist.classes, stats: dist.stats };
}

export function estimateRankValue(moyenne, filiere, distribution) {
  const result = estimateRank(moyenne, filiere, distribution);
  return result ? result.rank : null;
}

export function moyenneForRank(target, filiere, distribution) {
  const dist = distribution.filieres[filiere];
  if (!dist) return null;
  let lo = 0;
  let hi = 20;
  if (estimateRankValue(hi, filiere, distribution) > target) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (estimateRankValue(mid, filiere, distribution) <= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function smallestNoteReaching(target, filiere, knownScore, remainingCoef, total, distribution) {
  for (let quarters = 0; quarters <= 80; quarters++) {
    const note = quarters / 4;
    const moyenne = (knownScore + remainingCoef * note) / total;
    const rank = estimateRankValue(moyenne, filiere, distribution);
    if (rank != null && rank <= target) return note;
  }
  return null;
}

export function computeScore(notes, matieres, total, bonus = false) {
  let score = 0;
  let hasAnyNote = false;
  for (const [nom, coef] of Object.entries(matieres)) {
    const note = notes[nom];
    if (typeof note === 'number' && !isNaN(note)) {
      score += note * coef;
      hasAnyNote = true;
    }
  }
  if (bonus) score += 15;
  const max = total * 20;
  const moyenne = hasAnyNote ? score / total : null;
  return { score, max, moyenne, hasAnyNote };
}
