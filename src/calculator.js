import coefficients from './data/coefficients.json' with { type: 'json' };
import distribution2025 from './data/distribution_moyennes_2025.json' with { type: 'json' };
import distribution2024 from './data/distribution_moyennes_2024.json' with { type: 'json' };
import distribution2020 from './data/distribution_moyennes_2020_simulee.json' with { type: 'json' };
import guideRangsCapacites from './data/guide_rangs_capacites.json' with { type: 'json' };

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
    input.placeholder = '—';
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
  const rank = Math.min(rankRaw, dist.classes);
  return { rank, classes: dist.classes, stats: dist.stats };
}

// tier from a single admission-threshold rang (no min/max range available):
// 'probable' = comfortable margin below the threshold, 'incertain' = close to it,
// 'impossible' = estimated rank is worse than the threshold.
function computeTier(rank, seuil) {
  if (typeof seuil !== 'number') return null;
  if (rank > seuil) return 'impossible';
  if (rank <= seuil * 0.8) return 'probable';
  return 'incertain';
}

const TIER_LABEL = { probable: 'Probable', incertain: 'Incertain', impossible: 'Hors de portée' };
const TIER_ORDER = { probable: 0, incertain: 1, impossible: 2 };

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

  state.reachRows = programmes
    .filter((p) => p.capacite && typeof p.rang === 'number')
    .map((p) => ({
      inst: p.institution,
      spec: p.filiere,
      seuil: p.rang,
      cap: p.capacite,
      tier: computeTier(estimatedRank, p.rang),
    }));

  reachTitleEl.textContent = `Écoles potentiellement accessibles — filière ${filiere}`;
  renderReachList();
}

function renderReachList() {
  if (!reachListEl) return;
  const term = (state.reachSearch || '').trim().toLowerCase();
  const rows = (state.reachRows || [])
    .filter((r) => !term || r.inst.toLowerCase().includes(term) || r.spec.toLowerCase().includes(term))
    .sort((a, b) => (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || (a.seuil - b.seuil));

  reachListEl.innerHTML = '';

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'reach-empty';
    empty.textContent = '—';
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
    name.textContent = `${r.inst} — ${r.spec}`;

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
  let score = 0;
  let hasAnyNote = false;
  for (const [nom, coef] of Object.entries(matieres)) {
    const note = state.notes[nom];
    if (typeof note === 'number' && !isNaN(note)) {
      score += note * coef;
      hasAnyNote = true;
    }
  }
  const max = total * 20;
  const moyenne = hasAnyNote ? score / total : 0;
  moyValueEl.textContent = round2(moyenne);
  scoreValueEl.textContent = round2(score);
  scoreMaxEl.textContent = max;
  moyCmpEl.textContent = '';

  const yearInfo = YEARS.find((y) => y.key === state.year);
  rankTitleEl.textContent = `Rang estimé — session ${yearInfo.label}${yearInfo.suffix}`;

  if (!hasAnyNote) {
    rankValueEl.textContent = '—';
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
    rankValueEl.textContent = '—';
    rankSubEl.textContent = 'Pas de données pour cette filière/année';
    state.reachRows = [];
    renderReachList();
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
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
