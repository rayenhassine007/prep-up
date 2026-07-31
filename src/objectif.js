// Objectif — the score calculator in reverse.
//
// "Calculer mon rang" goes notes -> score -> rang. This goes the other way:
// rang visé -> moyenne pondérée nécessaire -> note nécessaire par matière.
//
// Two steps:
//  1. rang -> moyenne. estimateRank() (src/calculator.js) is monotonically
//     decreasing in the moyenne, so it can be inverted by bisection on the same
//     distribution data — no second, drifting copy of the model.
//  2. moyenne -> notes. A moyenne only fixes the coefficient-weighted total, so
//     infinitely many note combinations reach it. We resolve that by letting the
//     student pin the notes they are confident about; the remaining matières
//     then have exactly one answer: the note they must all reach.

import coefficients from './data/coefficients.json' with { type: 'json' };
import distribution2025 from './data/distribution_moyennes_2025.json' with { type: 'json' };
import distribution2024 from './data/distribution_moyennes_2024.json' with { type: 'json' };
import distribution2020 from './data/distribution_moyennes_2020_simulee.json' with { type: 'json' };

const FILIERES = ['MP', 'PC', 'T', 'BG'];
const YEARS = [
  { key: '2025', label: '2025', dist: distribution2025 },
  { key: '2024', label: '2024', dist: distribution2024 },
  { key: '2020', label: '2020', dist: distribution2020 },
];

const state = {
  filiere: 'MP',
  year: '2025',
  targetRank: null,
  notes: {}, // matière -> note the student expects to get
};

let elFiliere, elYear, elRankInput, elMoyValue, elMoySub, elMatieres, elVerdict, elResetBtn, elHint;

function q(id) { return document.getElementById(id); }
function round2(n) { return Math.round(n * 100) / 100; }

// Same model as the forward calculator: rank of a candidate with this moyenne.
function estimateRank(moyenne, filiere, distribution) {
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
  return Math.min(rankRaw, dist.classes);
}

// Invert the above: the lowest moyenne that still reaches `target` or better.
// Bisection is safe here because estimateRank never improves as the moyenne drops.
function moyenneForRank(target, filiere, distribution) {
  const dist = distribution.filieres[filiere];
  if (!dist) return null;
  let lo = 0, hi = 20;
  if (estimateRank(hi, filiere, distribution) > target) return null; // unreachable even at 20/20
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (estimateRank(mid, filiere, distribution) <= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Smallest quarter-point note in every unfilled matière that actually reaches
// `target` when fed back through estimateRank. Returns null if even 20/20 in all
// of them falls short. Notes are graded in quarter points, so we walk the 81
// real options and verify each rather than trusting arithmetic at a step edge.
function smallestNoteReaching(target, knownScore, remainingCoef, total, distribution) {
  for (let quarters = 0; quarters <= 80; quarters++) {
    const note = quarters / 4;
    const moyenne = (knownScore + remainingCoef * note) / total;
    const rank = estimateRank(moyenne, state.filiere, distribution);
    if (rank != null && rank <= target) return note;
  }
  return null;
}

function currentYear() { return YEARS.find((y) => y.key === state.year); }
function currentCoefs() { return coefficients.filieres[state.filiere]; }

// The whole computation for the current state.
function compute() {
  const { matieres, total } = currentCoefs();
  const year = currentYear();
  const dist = year.dist.filieres[state.filiere];
  if (state.targetRank == null) return { status: 'no-target' };
  if (!dist) return { status: 'no-data' };

  const classes = dist.classes;
  // a rang worse than the last ranked candidate is not a meaningful objective
  if (state.targetRank > classes) return { status: 'beyond-classes', classes };
  const moyenne = moyenneForRank(state.targetRank, state.filiere, year.dist);
  if (moyenne == null) return { status: 'impossible-rank', classes };

  const requiredScore = moyenne * total;

  let knownScore = 0;
  let remainingCoef = 0;
  const rows = [];
  for (const [nom, coef] of Object.entries(matieres)) {
    const note = state.notes[nom];
    const known = typeof note === 'number' && !isNaN(note);
    if (known) knownScore += note * coef;
    else remainingCoef += coef;
    rows.push({ nom, coef, note: known ? note : null, known });
  }

  // Note every unfilled matière must reach for the total to land on requiredScore.
  let needed = null;
  let status = 'ok';
  if (remainingCoef === 0) {
    // everything filled: it either clears the bar or it doesn't
    status = knownScore >= requiredScore - 1e-9 ? 'all-filled-ok' : 'all-filled-short';
  } else {
    // Solve for the note directly against the forward model instead of dividing
    // the required score out. estimateRank is a rounded step function, so a note
    // derived arithmetically can land a hair under a step and miss the target by
    // one rank; searching quarter-point notes and checking each one can't.
    needed = smallestNoteReaching(state.targetRank, knownScore, remainingCoef, total, year.dist);
    if (needed == null) status = 'unreachable';  // even 20/20 everywhere is not enough
    else if (needed <= 0) status = 'already-there'; // pinned notes alone already clear it
  }

  for (const r of rows) if (!r.known) r.needed = needed;

  return {
    status, moyenne, requiredScore, knownScore, remainingCoef, needed, rows,
    total, classes,
    maxScore: total * 20,
    achievedMoyenne: total ? knownScore / total : 0,
  };
}

function renderFiliereButtons() {
  elFiliere.innerHTML = '';
  for (const f of FILIERES) {
    const btn = document.createElement('button');
    btn.textContent = f;
    btn.className = f === state.filiere ? 'active' : '';
    btn.addEventListener('click', () => {
      state.filiere = f;
      state.notes = {}; // matières differ per filière
      renderFiliereButtons();
      renderAll();
    });
    elFiliere.appendChild(btn);
  }
}

function renderYearButtons() {
  elYear.innerHTML = '';
  for (const y of YEARS) {
    const btn = document.createElement('button');
    btn.textContent = y.label;
    btn.className = y.key === state.year ? 'active' : '';
    btn.addEventListener('click', () => {
      state.year = y.key;
      renderYearButtons();
      renderAll();
    });
    elYear.appendChild(btn);
  }
}

// `needed` already lands on a quarter point (see smallestNoteReaching), so this
// only trims the trailing zeros: 12 -> "12", 12.5 -> "12.5", 12.25 -> "12.25".
function fmtNote(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function renderMatieres(res) {
  elMatieres.innerHTML = '';
  const { matieres } = currentCoefs();

  for (const [nom, coef] of Object.entries(matieres)) {
    const row = document.createElement('div');
    row.className = 'matiere-row obj-row';

    const label = document.createElement('label');
    label.textContent = nom;
    label.htmlFor = `obj-note-${nom}`;

    const coefSpan = document.createElement('span');
    coefSpan.className = 'coef';
    coefSpan.textContent = `coef ${coef}`;

    const need = document.createElement('span');
    need.className = 'obj-need';
    const note = state.notes[nom];
    const filled = typeof note === 'number' && !isNaN(note);

    if (!res || !('rows' in res)) { // no target / no data / rang out of range
      need.textContent = '';
    } else if (filled) {
      need.textContent = 'saisi';
      need.classList.add('is-set');
    } else if (res.status === 'unreachable') {
      need.textContent = '> 20';
      need.classList.add('is-bad');
    } else if (res.status === 'already-there') {
      need.textContent = 'libre';
      need.classList.add('is-good');
    } else if (typeof res.needed === 'number') {
      need.textContent = `il te faut ${fmtNote(res.needed)}`;
      need.classList.add(res.needed > 16 ? 'is-hard' : 'is-need');
    }

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `obj-note-${nom}`;
    input.min = '0';
    input.max = '20';
    input.step = '0.25';
    input.placeholder = '—';
    input.inputMode = 'decimal';
    if (filled) input.value = note;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      if (input.value === '') {
        delete state.notes[nom];
        input.classList.remove('invalid');
      } else if (isNaN(val) || val < 0 || val > 20) {
        input.classList.add('invalid');
        delete state.notes[nom];
      } else {
        input.classList.remove('invalid');
        state.notes[nom] = val;
      }
      renderAll({ keepFocus: input.id });
    });

    row.appendChild(label);
    row.appendChild(coefSpan);
    row.appendChild(need);
    row.appendChild(input);
    elMatieres.appendChild(row);
  }
}

function renderResult(res) {
  const year = currentYear();

  if (res.status === 'no-target') {
    elMoyValue.textContent = '—';
    elMoySub.textContent = 'Entre un rang visé pour voir les notes nécessaires';
    elVerdict.textContent = '';
    elVerdict.className = 'obj-verdict';
    return;
  }
  if (res.status === 'no-data') {
    elMoyValue.textContent = '—';
    elMoySub.textContent = 'Pas de données pour cette filière / année';
    elVerdict.textContent = '';
    elVerdict.className = 'obj-verdict';
    return;
  }
  if (res.status === 'beyond-classes') {
    elMoyValue.textContent = '—';
    elMoySub.textContent = `En ${year.label}, seuls ${res.classes} candidats étaient classés en ${state.filiere} — vise un rang entre 1 et ${res.classes}.`;
    elVerdict.textContent = '';
    elVerdict.className = 'obj-verdict';
    return;
  }
  if (res.status === 'impossible-rank') {
    elMoyValue.textContent = '—';
    elMoySub.textContent = `Ce rang est hors d'atteinte même avec 20/20 (${res.classes} candidats classés en ${year.label})`;
    elVerdict.textContent = '';
    elVerdict.className = 'obj-verdict';
    return;
  }

  elMoyValue.textContent = round2(res.moyenne);
  elMoySub.innerHTML =
    `moyenne pondérée nécessaire pour viser le rang <strong>${state.targetRank}</strong> ` +
    `— soit un score de <strong>${round2(res.requiredScore)}</strong> / ${res.maxScore} (session ${year.label})`;

  let cls = 'obj-verdict', txt = '';
  if (res.status === 'unreachable') {
    cls += ' bad';
    txt = 'Même avec 20/20 dans toutes les matières restantes, ce rang ne serait pas atteint. Baisse ton objectif ou revois les notes déjà saisies.';
  } else if (res.status === 'already-there') {
    cls += ' good';
    txt = 'Tes notes saisies suffisent déjà à atteindre ce rang — le reste est du bonus.';
  } else if (res.status === 'all-filled-ok') {
    cls += ' good';
    txt = `Toutes les matières sont remplies : moyenne ${round2(res.achievedMoyenne)}/20, soit au-dessus des ${round2(res.moyenne)}/20 nécessaires. Objectif atteint.`;
  } else if (res.status === 'all-filled-short') {
    cls += ' bad';
    const missing = res.requiredScore - res.knownScore;
    txt = `Toutes les matières sont remplies : moyenne ${round2(res.achievedMoyenne)}/20, il manque ${round2(res.moyenne - res.achievedMoyenne)} point(s) de moyenne (${round2(missing)} points de score) pour ce rang.`;
  } else if (res.remainingCoef > 0 && Object.keys(state.notes).length === 0) {
    txt = `Il te faut ${fmtNote(res.needed)}/20 dans chaque matière. Remplis celles dont tu es sûr pour ajuster les autres.`;
  } else {
    txt = `Il te faut ${fmtNote(res.needed)}/20 dans chacune des matières restantes.`;
    if (res.needed > 16) { cls += ' warn'; txt += ' C\'est un objectif exigeant.'; }
  }
  elVerdict.className = cls;
  elVerdict.textContent = txt;
}

function renderAll(opts = {}) {
  const res = compute();
  renderResult(res);
  renderMatieres(res);
  if (opts.keepFocus) {
    const el = document.getElementById(opts.keepFocus);
    if (el) {
      const v = el.value;
      el.focus();
      // keep the caret at the end after the re-render
      try { el.setSelectionRange(v.length, v.length); } catch (e) {}
    }
  }
}

function init() {
  elFiliere = q('obj-filiere-select');
  elYear = q('obj-year-select');
  elRankInput = q('obj-rank-input');
  elMoyValue = q('obj-moy-value');
  elMoySub = q('obj-moy-sub');
  elMatieres = q('obj-matieres');
  elVerdict = q('obj-verdict');
  elResetBtn = q('obj-reset-btn');
  elHint = q('obj-hint');
  if (!elFiliere || !elMatieres) return;

  elRankInput.addEventListener('input', () => {
    const v = parseInt(elRankInput.value, 10);
    state.targetRank = (!isNaN(v) && v > 0) ? v : null;
    renderAll();
  });

  elResetBtn.addEventListener('click', () => {
    state.notes = {};
    renderAll();
  });

  // start on the filière the student picked in the score tab, if any
  const info = window.__prepupRank;
  if (info && info.filiere && FILIERES.includes(info.filiere)) state.filiere = info.filiere;

  renderFiliereButtons();
  renderYearButtons();
  renderAll();
}

init();
