// 1ère année — moyenne du semestre, et ce qu'il faut pour viser une moyenne.
//
// Unlike the concours tool next to it, there is no rang here: a 1ère année mark
// does not feed the national ranking. This is the ordinary school arithmetic
// from the official "Modalités d'Évaluation":
//
//   matière sans TP : tests & oral 15 %, devoirs surveillés 35 %, examen 50 %
//   matière avec TP : tests & oral 15 %, devoirs surveillés 25 %, TP 20 %, examen 40 %
//   moyenne annuelle = (2 × S1 + 3 × S2) / 5
//
// A student can type a matière average straight in, or expand a row and let the
// weighting compute it. Coefficients come from the 1ère année tables (which are
// not the concours ones) and stay editable, since an établissement may weigh its
// year differently.

import coefficients from './data/coefficients_1ere_annee.json' with { type: 'json' };

// The 1ère année tables cover MP, PC and T; BG is not among them.
const FILIERES = Object.keys(coefficients.filieres);
const SEMESTRES = ['S1', 'S2'];
const STORE_KEY = 'prepup:annee1';

// component -> share of the matière mark, per the official modalities
const PONDERATION = {
  sansTP: [['tests', 'Tests & oral', 0.15], ['ds', 'Devoirs surveillés', 0.35], ['exam', 'Examen', 0.50]],
  avecTP: [['tests', 'Tests & oral', 0.15], ['ds', 'Devoirs surveillés', 0.25], ['tp', 'TP', 0.20], ['exam', 'Examen', 0.40]],
};

const state = {
  filiere: FILIERES[0],
  semestre: 'S1',
  target: null,
  rows: {},          // "S1|MP|matière" -> {coef, avecTP, detail, moy, tests, ds, tp, exam}
  otherSemMoy: null, // manually entered moyenne of the other semester (annual formula)
};

let elFiliere, elSem, elMoy, elMoySub, elTarget, elVerdict, elMatieres, elAnnual, elReset;

function q(id) { return document.getElementById(id); }
function round2(n) { return Math.round(n * 100) / 100; }
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && typeof raw === 'object') {
      if (raw.rows && typeof raw.rows === 'object') state.rows = raw.rows;
      // a filière saved before (or outside) the 1ère année tables falls back
      if (FILIERES.includes(raw.filiere)) state.filiere = raw.filiere;
      else state.filiere = FILIERES[0];
      if (SEMESTRES.includes(raw.semestre)) state.semestre = raw.semestre;
      if (typeof raw.target === 'number') state.target = raw.target;
      if (typeof raw.otherSemMoy === 'number') state.otherSemMoy = raw.otherSemMoy;
    }
  } catch (e) {} // private mode / corrupted value: start fresh
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      rows: state.rows, filiere: state.filiere, semestre: state.semestre,
      target: state.target, otherSemMoy: state.otherSemMoy,
    }));
  } catch (e) {}
}

function matieres() { return coefficients.filieres[state.filiere].matieres; }
function rowKey(nom) { return `${state.semestre}|${state.filiere}|${nom}`; }

// `m` is the matière definition: { nom, coef, tp?, note? }
function getRow(m) {
  const k = rowKey(m.nom);
  if (!state.rows[k]) state.rows[k] = { coef: m.coef, avecTP: Boolean(m.tp), detail: false };
  const r = state.rows[k];
  if (typeof r.coef !== 'number') r.coef = m.coef;
  return r;
}

// A matière mark from its components. Components left blank are ignored and the
// remaining weights renormalised, so a mid-semester student still gets a figure
// — flagged partial so it is not mistaken for a settled mark.
function moyFromComponents(r) {
  const parts = PONDERATION[r.avecTP ? 'avecTP' : 'sansTP'];
  let sum = 0, weight = 0, filled = 0;
  for (const [key, , w] of parts) {
    const v = num(r[key]);
    if (v == null) continue;
    sum += v * w; weight += w; filled++;
  }
  if (weight === 0) return { moy: null, partial: false, filled: 0, total: parts.length };
  return { moy: sum / weight, partial: filled < parts.length, filled, total: parts.length };
}

// The mark actually used for a matière: computed when the row is expanded,
// typed otherwise.
function effectiveMoy(r) {
  if (r.detail) return moyFromComponents(r).moy;
  return num(r.moy);
}

function compute() {
  const ms = matieres();
  let weighted = 0, coefSum = 0, blankCoef = 0;
  const rows = [];
  for (const m of ms) {
    const r = getRow(m);
    const moy = effectiveMoy(r);
    const coef = typeof r.coef === 'number' && r.coef > 0 ? r.coef : 0;
    if (moy != null) { weighted += moy * coef; coefSum += coef; }
    else blankCoef += coef;
    rows.push({ nom: m.nom, note: m.note, r, moy, coef });
  }
  const moyenne = coefSum > 0 ? weighted / coefSum : null;
  const totalCoef = coefSum + blankCoef;

  // What every still-empty matière must average for the whole semester to reach
  // the target. Only meaningful while something is still blank.
  let needed = null, verdict = 'none';
  if (state.target != null && totalCoef > 0) {
    if (blankCoef === 0) {
      verdict = moyenne != null && moyenne >= state.target - 1e-9 ? 'reached' : 'short';
    } else {
      needed = (state.target * totalCoef - weighted) / blankCoef;
      if (needed > 20 + 1e-9) verdict = 'impossible';
      else if (needed <= 1e-9) verdict = 'secured';
      else verdict = 'need';
    }
  }
  return { rows, moyenne, coefSum, blankCoef, totalCoef, needed, verdict };
}

function renderFiliere() {
  elFiliere.innerHTML = '';
  for (const f of FILIERES) {
    const b = document.createElement('button');
    b.textContent = f;
    b.className = f === state.filiere ? 'active' : '';
    b.addEventListener('click', () => { state.filiere = f; save(); render(); });
    elFiliere.appendChild(b);
  }
}

function renderSem() {
  elSem.innerHTML = '';
  for (const s of SEMESTRES) {
    const b = document.createElement('button');
    b.textContent = s === 'S1' ? 'Semestre 1' : 'Semestre 2';
    b.className = s === state.semestre ? 'active' : '';
    b.addEventListener('click', () => { state.semestre = s; save(); render(); });
    elSem.appendChild(b);
  }
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function renderMatieres(res) {
  elMatieres.innerHTML = '';
  for (const { nom, note, r, moy, coef } of res.rows) {
    const card = document.createElement('div');
    card.className = 'a1-card';

    const head = document.createElement('div');
    head.className = 'a1-head';

    const label = document.createElement('span');
    label.className = 'a1-name';
    label.textContent = nom;
    if (note) {
      const sub = document.createElement('span');
      sub.className = 'a1-note';
      sub.textContent = note; // e.g. "MSI 65 % + Automatique 35 %"
      label.appendChild(sub);
    }

    // coefficient — editable, the published set is only a starting point
    const coefWrap = document.createElement('span');
    coefWrap.className = 'a1-coef';
    const coefLabel = document.createElement('span');
    coefLabel.textContent = 'coef';
    const coefInput = document.createElement('input');
    coefInput.type = 'number';
    coefInput.min = '0';
    coefInput.step = '0.5';
    coefInput.value = r.coef;
    coefInput.setAttribute('aria-label', `Coefficient de ${nom}`);
    coefInput.addEventListener('input', () => {
      const v = num(coefInput.value);
      r.coef = v == null || v < 0 ? 0 : v;
      save(); update();
    });
    coefWrap.appendChild(coefLabel);
    coefWrap.appendChild(coefInput);

    head.appendChild(label);
    head.appendChild(coefWrap);

    const body = document.createElement('div');
    body.className = 'a1-body';

    if (!r.detail) {
      const moyInput = document.createElement('input');
      moyInput.type = 'number';
      moyInput.min = '0'; moyInput.max = '20'; moyInput.step = '0.25';
      moyInput.placeholder = '—';
      moyInput.inputMode = 'decimal';
      moyInput.className = 'a1-moy-input';
      moyInput.setAttribute('aria-label', `Moyenne de ${nom}`);
      if (r.moy != null && r.moy !== '') moyInput.value = r.moy;
      moyInput.addEventListener('input', () => {
        const v = num(moyInput.value);
        moyInput.classList.toggle('invalid', moyInput.value !== '' && (v == null || v < 0 || v > 20));
        r.moy = moyInput.value === '' ? null : (v != null && v >= 0 && v <= 20 ? v : null);
        save(); update();
      });
      body.appendChild(moyInput);
    } else {
      const grid = document.createElement('div');
      grid.className = 'a1-grid';
      for (const [key, labelTxt, w] of PONDERATION[r.avecTP ? 'avecTP' : 'sansTP']) {
        const cell = document.createElement('label');
        cell.className = 'a1-cell';
        const cl = document.createElement('span');
        cl.className = 'a1-cell-label';
        cl.textContent = `${labelTxt} · ${Math.round(w * 100)}%`;
        const ci = document.createElement('input');
        ci.type = 'number';
        ci.min = '0'; ci.max = '20'; ci.step = '0.25';
        ci.placeholder = '—';
        ci.inputMode = 'decimal';
        if (r[key] != null && r[key] !== '') ci.value = r[key];
        ci.addEventListener('input', () => {
          const v = num(ci.value);
          ci.classList.toggle('invalid', ci.value !== '' && (v == null || v < 0 || v > 20));
          r[key] = ci.value === '' ? null : (v != null && v >= 0 && v <= 20 ? v : null);
          save(); update();
        });
        cell.appendChild(cl);
        cell.appendChild(ci);
        grid.appendChild(cell);
      }
      body.appendChild(grid);
    }

    const foot = document.createElement('div');
    foot.className = 'a1-foot';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'a1-toggle';
    toggle.textContent = r.detail ? '← Saisir la moyenne' : 'Détailler ▾';
    toggle.addEventListener('click', () => { r.detail = !r.detail; save(); render(); });
    foot.appendChild(toggle);

    if (r.detail) {
      const tp = document.createElement('label');
      tp.className = 'a1-tp';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = Boolean(r.avecTP);
      cb.addEventListener('change', () => { r.avecTP = cb.checked; save(); render(); });
      tp.appendChild(cb);
      tp.appendChild(document.createTextNode(' avec TP'));
      foot.appendChild(tp);
    }

    const out = document.createElement('span');
    out.className = 'a1-out';
    if (moy != null) {
      const info = r.detail ? moyFromComponents(r) : { partial: false };
      out.textContent = `${fmt(moy)}/20` + (info.partial ? ` · partiel (${info.filled}/${info.total})` : '');
      out.classList.add(info.partial ? 'is-partial' : 'is-ok');
    } else if (res.verdict === 'need' && res.needed != null) {
      out.textContent = `il te faut ${fmt(res.needed)}`;
      out.classList.add('is-need');
    } else {
      out.textContent = '';
    }
    foot.appendChild(out);

    card.appendChild(head);
    card.appendChild(body);
    card.appendChild(foot);
    elMatieres.appendChild(card);
  }
}

function renderResult(res) {
  elMoy.textContent = res.moyenne == null ? '—' : round2(res.moyenne);
  const done = res.totalCoef ? Math.round((res.coefSum / res.totalCoef) * 100) : 0;
  elMoySub.textContent = res.moyenne == null
    ? `Moyenne du ${state.semestre === 'S1' ? 'semestre 1' : 'semestre 2'} — saisis tes notes`
    : `moyenne du ${state.semestre === 'S1' ? 'semestre 1' : 'semestre 2'} · ${done}% des coefficients saisis`;

  let cls = 'obj-verdict', txt = '';
  switch (res.verdict) {
    case 'need':
      txt = `Il te faut ${fmt(res.needed)}/20 de moyenne dans chaque matière qu'il te reste à remplir.`;
      if (res.needed > 16) { cls += ' warn'; txt += ' C\'est exigeant.'; }
      break;
    case 'impossible':
      cls += ' bad';
      txt = `Même avec 20/20 partout ailleurs, la moyenne de ${fmt(state.target)} ne serait pas atteinte.`;
      break;
    case 'secured':
      cls += ' good';
      txt = 'Tes notes actuelles suffisent déjà — la moyenne visée est acquise.';
      break;
    case 'reached':
      cls += ' good';
      txt = `Toutes les matières sont remplies : ${round2(res.moyenne)}/20, objectif atteint.`;
      break;
    case 'short':
      cls += ' bad';
      txt = `Toutes les matières sont remplies : ${round2(res.moyenne)}/20, il manque ${round2(state.target - res.moyenne)} point(s) pour ${fmt(state.target)}.`;
      break;
    default:
      txt = '';
  }
  elVerdict.className = cls;
  elVerdict.textContent = txt;
}

// moyenne annuelle = (2 × S1 + 3 × S2) / 5
function renderAnnual(res) {
  elAnnual.innerHTML = '';
  const thisSem = res.moyenne;
  const otherLabel = state.semestre === 'S1' ? 'S2' : 'S1';

  const wrap = document.createElement('div');
  wrap.className = 'a1-annual-box';

  const title = document.createElement('div');
  title.className = 'a1-annual-title';
  title.textContent = 'Moyenne annuelle';
  wrap.appendChild(title);

  const row = document.createElement('div');
  row.className = 'a1-annual-row';

  const lbl = document.createElement('label');
  lbl.htmlFor = 'a1-other-sem';
  lbl.textContent = `Ta moyenne de ${otherLabel}`;
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.id = 'a1-other-sem';
  inp.min = '0'; inp.max = '20'; inp.step = '0.25';
  inp.placeholder = '—';
  inp.inputMode = 'decimal';
  if (state.otherSemMoy != null) inp.value = state.otherSemMoy;
  inp.addEventListener('input', () => {
    const v = num(inp.value);
    state.otherSemMoy = (v != null && v >= 0 && v <= 20) ? v : null;
    save();
    renderAnnual(compute());
  });
  row.appendChild(lbl);
  row.appendChild(inp);
  wrap.appendChild(row);

  const out = document.createElement('div');
  out.className = 'a1-annual-out';
  if (thisSem == null || state.otherSemMoy == null) {
    out.textContent = `Renseigne les deux semestres pour voir ta moyenne annuelle — (2 × S1 + 3 × S2) / 5.`;
  } else {
    const s1 = state.semestre === 'S1' ? thisSem : state.otherSemMoy;
    const s2 = state.semestre === 'S1' ? state.otherSemMoy : thisSem;
    const annual = (2 * s1 + 3 * s2) / 5;
    out.innerHTML = `S1 <strong>${round2(s1)}</strong> · S2 <strong>${round2(s2)}</strong> → moyenne annuelle <strong>${round2(annual)}</strong>/20`;
  }
  wrap.appendChild(out);
  elAnnual.appendChild(wrap);
}

// full rebuild (structure changed)
function render() {
  renderFiliere();
  renderSem();
  const res = compute();
  renderResult(res);
  renderMatieres(res);
  renderAnnual(res);
}

// values changed but the structure did not — leave the inputs (and focus) alone
function update() {
  const res = compute();
  renderResult(res);
  renderAnnual(res);
  // refresh only the per-matière readouts
  const outs = elMatieres.querySelectorAll('.a1-foot .a1-out');
  res.rows.forEach(({ r, moy }, i) => {
    const out = outs[i];
    if (!out) return;
    out.className = 'a1-out';
    if (moy != null) {
      const info = r.detail ? moyFromComponents(r) : { partial: false };
      out.textContent = `${fmt(moy)}/20` + (info.partial ? ` · partiel (${info.filled}/${info.total})` : '');
      out.classList.add(info.partial ? 'is-partial' : 'is-ok');
    } else if (res.verdict === 'need' && res.needed != null) {
      out.textContent = `il te faut ${fmt(res.needed)}`;
      out.classList.add('is-need');
    } else {
      out.textContent = '';
    }
  });
}

function setupModeSwitch() {
  const bar = q('obj-mode-switch');
  const concours = q('obj-mode-concours');
  const annee1 = q('obj-mode-annee1');
  if (!bar || !concours || !annee1) return;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    const isA1 = b.dataset.mode === 'annee1';
    concours.hidden = isA1;
    annee1.hidden = !isA1;
  });
}

function init() {
  elFiliere = q('a1-filiere');
  elSem = q('a1-sem');
  elMoy = q('a1-moy');
  elMoySub = q('a1-moy-sub');
  elTarget = q('a1-target');
  elVerdict = q('a1-verdict');
  elMatieres = q('a1-matieres');
  elAnnual = q('a1-annual');
  elReset = q('a1-reset');
  if (!elFiliere || !elMatieres) return;

  setupModeSwitch();
  load();

  if (state.target != null) elTarget.value = state.target;
  elTarget.addEventListener('input', () => {
    const v = num(elTarget.value);
    state.target = (v != null && v >= 0 && v <= 20) ? v : null;
    save(); update();
  });

  elReset.addEventListener('click', () => {
    // only the semester on screen — the other one is someone else's work
    for (const k of Object.keys(state.rows)) {
      if (k.startsWith(`${state.semestre}|${state.filiere}|`)) delete state.rows[k];
    }
    save();
    render();
  });

  render();
}

init();
