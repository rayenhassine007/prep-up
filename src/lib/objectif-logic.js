/** Inverse calculator: target rank to required notes. */

import {
  estimateRankValue,
  moyenneForRank,
  smallestNoteReaching,
} from './rank.js';

export function resolveSchoolRank(programme, track, preferYear) {
  const tr = programme[track];
  if (!tr || !(tr.capacite > 0)) return null;
  const r24 = typeof tr.rang_max === 'number' ? tr.rang_max : null;
  const r25 = programme.r2025 && programme.r2025[track] && typeof programme.r2025[track][1] === 'number'
    ? programme.r2025[track][1]
    : null;
  const prefer25 = preferYear === '2025';
  if (prefer25 && r25 != null) return { rang: r25, srcYear: '2025' };
  if (!prefer25 && r24 != null) return { rang: r24, srcYear: '2024' };
  if (r24 != null) return { rang: r24, srcYear: '2024' };
  if (r25 != null) return { rang: r25, srcYear: '2025' };
  return null;
}

export function schoolOptions(programmes, track, preferYear) {
  const out = [];
  for (const p of programmes || []) {
    const resolved = resolveSchoolRank(p, track, preferYear);
    if (!resolved) continue;
    out.push({
      inst: p.institution,
      spec: p.filiere,
      rang: resolved.rang,
      srcYear: resolved.srcYear,
      key: `${p.institution}||${p.filiere}`,
    });
  }
  out.sort((a, b) => a.inst.localeCompare(b.inst) || a.spec.localeCompare(b.spec));
  return out;
}

export function computeObjectif({
  filiere,
  targetRank,
  notes,
  matieres,
  total,
  distribution,
}) {
  const dist = distribution.filieres[filiere];
  if (targetRank == null) return { status: 'no-target' };
  if (!dist) return { status: 'no-data' };

  const { classes } = dist;
  if (targetRank > classes) return { status: 'beyond-classes', classes };
  const moyenne = moyenneForRank(targetRank, filiere, distribution);
  if (moyenne == null) return { status: 'impossible-rank', classes };

  const requiredScore = moyenne * total;
  let knownScore = 0;
  let remainingCoef = 0;
  const rows = [];
  for (const [nom, coef] of Object.entries(matieres)) {
    const note = notes[nom];
    const known = typeof note === 'number' && !Number.isNaN(note);
    if (known) knownScore += note * coef;
    else remainingCoef += coef;
    rows.push({ nom, coef, note: known ? note : null, known });
  }

  let needed = null;
  let status = 'ok';
  if (remainingCoef === 0) {
    status = knownScore >= requiredScore - 1e-9 ? 'all-filled-ok' : 'all-filled-short';
  } else {
    needed = smallestNoteReaching(targetRank, filiere, knownScore, remainingCoef, total, distribution);
    if (needed == null) status = 'unreachable';
    else if (needed <= 0) status = 'already-there';
  }

  for (const r of rows) if (!r.known) r.needed = needed;

  return {
    status,
    moyenne,
    requiredScore,
    knownScore,
    remainingCoef,
    needed,
    rows,
    total,
    classes,
    maxScore: total * 20,
    achievedMoyenne: total ? knownScore / total : 0,
  };
}

export { estimateRankValue, moyenneForRank };
