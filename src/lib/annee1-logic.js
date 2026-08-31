/** 1ère année semester averages and target solver. */

export const PONDERATION = {
  sansTP: [['tests', 'Tests & oral', 0.15], ['ds', 'Devoirs surveillés', 0.35], ['exam', 'Examen', 0.50]],
  avecTP: [['tests', 'Tests & oral', 0.15], ['ds', 'Devoirs surveillés', 0.25], ['tp', 'TP', 0.20], ['exam', 'Examen', 0.40]],
};

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function num(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export function moyFromComponents(row) {
  const parts = PONDERATION[row.avecTP ? 'avecTP' : 'sansTP'];
  let sum = 0;
  let weight = 0;
  let filled = 0;
  for (const [key, , w] of parts) {
    const v = num(row[key]);
    if (v == null) continue;
    sum += v * w;
    weight += w;
    filled++;
  }
  if (weight === 0) return { moy: null, partial: false, filled: 0, total: parts.length };
  return { moy: sum / weight, partial: filled < parts.length, filled, total: parts.length };
}

export function effectiveMoy(row) {
  if (row.detail) return moyFromComponents(row).moy;
  return num(row.moy);
}

export function computeSemester(matieres, getRow, target) {
  let weighted = 0;
  let coefSum = 0;
  let blankCoef = 0;
  const rows = [];
  for (const m of matieres) {
    const r = getRow(m);
    const moy = effectiveMoy(r);
    const coef = typeof r.coef === 'number' && r.coef > 0 ? r.coef : 0;
    if (moy != null) {
      weighted += moy * coef;
      coefSum += coef;
    } else blankCoef += coef;
    rows.push({ nom: m.nom, note: m.note, r, moy, coef });
  }
  const moyenne = coefSum > 0 ? weighted / coefSum : null;
  const totalCoef = coefSum + blankCoef;

  let needed = null;
  let verdict = 'none';
  if (target != null && totalCoef > 0) {
    if (blankCoef === 0) {
      verdict = moyenne != null && moyenne >= target - 1e-9 ? 'reached' : 'short';
    } else {
      needed = (target * totalCoef - weighted) / blankCoef;
      if (needed > 20 + 1e-9) verdict = 'impossible';
      else if (needed <= 1e-9) verdict = 'secured';
      else verdict = 'need';
    }
  }
  return { rows, moyenne, coefSum, blankCoef, totalCoef, needed, verdict };
}

export function computeAnnual(s1, s2) {
  if (s1 == null || s2 == null) return null;
  return (2 * s1 + 3 * s2) / 5;
}

export function fmt(n) {
  const s = round2(n).toFixed(2);
  return s.replace(/\.?0+$/, '');
}
