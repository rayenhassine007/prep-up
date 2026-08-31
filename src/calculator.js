import coefficients from './data/coefficients.json' with { type: 'json' };
import distribution2025 from './data/distribution_moyennes_2025.json' with { type: 'json' };
import distribution2024 from './data/distribution_moyennes_2024.json' with { type: 'json' };
import distribution2020 from './data/distribution_moyennes_2020_simulee.json' with { type: 'json' };
import guideRangsCapacites from './data/guide_rangs_capacites.json' with { type: 'json' };
import { estimateRank, computeScore, round2 } from './lib/rank.js';
import {
  REACH_TIER_LABEL,
  buildReachRows,
  filterSortReachRows,
} from './lib/calculator-reach.js';

const FILIERES = ['MP', 'PC', 'T', 'BG'];
const YEARS = [
  { key: '2025', label: '2025', dist: distribution2025, suffix: '' },
  { key: '2024', label: '2024', dist: distribution2024, suffix: '' },
  { key: '2020', label: '2020', dist: distribution2020, suffix: '' },
];
// guideRangsCapacites uses "PT" for the Technologie filiere
const FILIERE_TO_RANGS_KEY = { MP: 'MP', PC: 'PC', T: 'PT', BG: 'BG' };

const state = {
  filiere: 'MP',
  year: '2025',
  notes: {},
  bonus: false,
  reachRows: [],
  reachSearch: '',
};

const filiereSelectEl = document.getElementById('filiere-select');
const matieresEl = document.getElementById('matieres');
const scoreValueEl = document.getElementById('score-value');
const scoreMaxEl = document.getElementById('score-max');
const scorePctEl = document.getElementById('score-pct');
const moyValueEl = document.getElementById('moy-value');
const moyCmpEl = document.getElementById('moy-cmp');
const resetBtn = document.getElementById('reset-btn');
const bonusCheckEl = document.getElementById('bonus-check');
const yearSelectEl = document.getElementById('year-select');
const rankTitleEl = document.getElementById('rank-title');
const rankValueEl = document.getElementById('rank-value');
const rankSubEl = document.getElementById('rank-sub');
const reachTitleEl = document.getElementById('reach-title');
const reachListEl = document.getElementById('reach-list');
const reachSearchEl = document.getElementById('reach-search');

if (reachSearchEl) {
  reachSearchEl.addEventListener('input', () => {
    state.reachSearch = reachSearchEl.value;
    renderReachList();
  });
}

if (bonusCheckEl) {
  bonusCheckEl.addEventListener('change', () => {
    state.bonus = bonusCheckEl.checked;
    updateScore();
  });
}

function renderFiliereButtons() {
  filiereSelectEl.innerHTML = '';
  for (const f of FILIERES) {
    const btn = document.createElement('button');
    btn.textContent = f;
    btn.className = f === state.filiere ? 'active' : '';
    btn.addEventListener('click', () => {
      state.filiere = f;
      state.notes = {};
      renderFiliereButtons();
      renderMatieres();
      updateScore();
    });
    filiereSelectEl.appendChild(btn);
  }
}

function renderYearButtons() {
  yearSelectEl.innerHTML = '';
  for (const y of YEARS) {
    const btn = document.createElement('button');
    btn.textContent = y.label;
    btn.className = y.key === state.year ? 'active' : '';
    btn.addEventListener('click', () => {
      state.year = y.key;
      renderYearButtons();
      updateScore();
    });
    yearSelectEl.appendChild(btn);
  }
}

function renderMatieres() {
  matieresEl.innerHTML = '';
  const { matieres } = coefficients.filieres[state.filiere];

  for (const [nom, coef] of Object.entries(matieres)) {
    const row = document.createElement('div');
    row.className = 'matiere-row';

    const label = document.createElement('label');
    label.textContent = nom;

    const coefSpan = document.createElement('span');
    coefSpan.className = 'coef';
    coefSpan.textContent = `coef ${coef}`;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '20';
    input.step = '0.25';
    input.placeholder = '-';
    input.inputMode = 'decimal';
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
      updateScore();
    });

    row.appendChild(label);
    row.appendChild(coefSpan);
    row.appendChild(input);
    matieresEl.appendChild(row);
  }
}

// Estimate rank from a Moyenne (/20) using a given year's distribution for this filiere.
// tier from a single admission-threshold rang (no min/max range available):
// 'probable' = comfortable margin below the threshold, 'incertain' = close to it,
// 'impossible' = estimated rank is worse than the threshold.

const TIER_LABEL = REACH_TIER_LABEL;

function renderReachability(estimatedRank, filiere, yearLabel) {
  if (!reachListEl) return;
  const rangsKey = FILIERE_TO_RANGS_KEY[filiere];
  const guideData = guideRangsCapacites[rangsKey];
  if (!guideData) {
    state.reachRows = [];
    reachTitleEl.textContent = 'Écoles potentiellement accessibles';
    renderReachList();
    return;
  }
  const programmes = guideData.programmes || [];

  state.reachRows = buildReachRows(programmes, estimatedRank);

  reachTitleEl.textContent = `Écoles potentiellement accessibles - filière ${filiere}`;
  renderReachList();
}

function renderReachList() {
  if (!reachListEl) return;
  const rows = filterSortReachRows(state.reachRows || [], state.reachSearch || '');

  reachListEl.innerHTML = '';

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'reach-empty';
    empty.textContent = '-';
    reachListEl.appendChild(empty);
    return;
  }

  for (const r of rows) {
    const item = document.createElement('div');
    item.className = 'reach-item';

    const badge = document.createElement('span');
    badge.className = `tier-badge ${r.tier}`;
    badge.textContent = TIER_LABEL[r.tier];

    const name = document.createElement('span');
    name.className = 'reach-name';
    name.textContent = `${r.inst} - ${r.spec}`;

    const range = document.createElement('span');
    range.className = 'reach-range';
    range.textContent = `seuil: ${r.seuil} · ${r.cap} places`;

    item.appendChild(badge);
    item.appendChild(name);
    item.appendChild(range);
    reachListEl.appendChild(item);
  }
}

function updateScore() {
  const { matieres, total } = coefficients.filieres[state.filiere];
  const { score, max, moyenne, hasAnyNote } = computeScore(state.notes, matieres, total, state.bonus);
  moyValueEl.textContent = round2(moyenne ?? 0);
  scoreValueEl.textContent = round2(score);
  scoreMaxEl.textContent = max;
  moyCmpEl.textContent = '';

  const yearInfo = YEARS.find((y) => y.key === state.year);
  rankTitleEl.textContent = `Rang estimé - session ${yearInfo.label}${yearInfo.suffix}`;

  if (!hasAnyNote) {
    rankValueEl.textContent = '-';
    rankSubEl.textContent = 'Entre tes notes pour voir une estimation';
    state.reachRows = [];
    renderReachList();
    return;
  }

  const estimate = estimateRank(moyenne, state.filiere, yearInfo.dist);

  if (estimate) {
    window.__prepupRank = { rank: estimate.rank, filiere: state.filiere }; // shared with the rank simulator (auto-fill)
    rankValueEl.textContent = `~ ${estimate.rank} / ${estimate.classes}`;
    const cmp = moyenne >= estimate.stats.moyenne ? 'au-dessus' : 'en-dessous';
    moyCmpEl.textContent = ` · ${cmp} de la moyenne ${yearInfo.label} (${estimate.stats.moyenne}/20)`;
    rankSubEl.textContent = '';
    renderReachability(estimate.rank, state.filiere, yearInfo.label);
  } else {
    rankValueEl.textContent = '-';
    rankSubEl.textContent = 'Pas de données pour cette filière/année';
    state.reachRows = [];
    renderReachList();
  }
}

resetBtn.addEventListener('click', () => {
  state.notes = {};
  renderMatieres();
  updateScore();
});

renderFiliereButtons();
renderYearButtons();
renderMatieres();
updateScore();
