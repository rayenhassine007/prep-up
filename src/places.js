import data from './data/places2026.json' with { type: 'json' };

// Places ouvertes session 2026 (JORT n°35 du 3 avril 2026).
// Pour mettre à jour : édite src/data/places2026.json

const FILIERES = ['Tous', 'MP', 'PC', 'T', 'BG'];

const state = { filiere: 'Tous', search: '' };

const totauxEl = document.getElementById('totaux');
const filiereSelectEl = document.getElementById('filiere-select');
const listEl = document.getElementById('places-list');
const searchEl = document.getElementById('places-search');

function renderTotaux() {
  const t = data.totaux;
  totauxEl.innerHTML = '';
  const items = [
    ['MP', t.MP], ['PC', t.PC], ['T', t.T], ['BG', t.BG],
  ];
  for (const [label, num] of items) {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<div class="stat-num">${num}</div><div class="stat-label">places ${label}</div>`;
    totauxEl.appendChild(div);
  }
}

searchEl.addEventListener('input', () => {
  state.search = searchEl.value;
  renderList();
});

function renderFiliereButtons() {
  filiereSelectEl.innerHTML = '';
  for (const f of FILIERES) {
    const btn = document.createElement('button');
    btn.textContent = f;
    btn.className = f === state.filiere ? 'active' : '';
    btn.addEventListener('click', () => {
      state.filiere = f;
      renderFiliereButtons();
      renderList();
    });
    filiereSelectEl.appendChild(btn);
  }
}

function specTotal(s) {
  return s.MP + s.PC + s.T + s.BG;
}

function matches(ecole, s) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return ecole.nom.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q);
}

function renderList() {
  listEl.innerHTML = '';
  const f = state.filiere;

  for (const ecole of data.ecoles) {
    let specs = ecole.specialites.filter((s) => matches(ecole, s));
    if (f !== 'Tous') specs = specs.filter((s) => s[f] > 0);
    if (specs.length === 0) continue;

    const card = document.createElement('div');
    card.className = 'res-group';

    const title = document.createElement('div');
    title.className = 'res-matiere';
    const ecoleTotal = specs.reduce((acc, s) => acc + (f === 'Tous' ? specTotal(s) : s[f]), 0);
    title.textContent = `${ecole.nom} — ${ecoleTotal} places`;
    card.appendChild(title);

    for (const s of specs) {
      const row = document.createElement('div');
      row.className = 'res-item';

      const name = document.createElement('span');
      name.className = 'res-name';
      name.textContent = s.nom;

      const meta = document.createElement('span');
      meta.className = 'res-meta';
      if (f === 'Tous') {
        const parts = [];
        if (s.MP) parts.push(`MP ${s.MP}`);
        if (s.PC) parts.push(`PC ${s.PC}`);
        if (s.T) parts.push(`T ${s.T}`);
        if (s.BG) parts.push(`BG ${s.BG}`);
        meta.textContent = `${parts.join(' · ')} — Total ${specTotal(s)}`;
      } else {
        meta.textContent = `${s[f]} places`;
      }

      row.appendChild(name);
      row.appendChild(meta);
      card.appendChild(row);
    }

    listEl.appendChild(card);
  }

  if (listEl.children.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'reach-empty';
    empty.textContent = 'Aucun résultat.';
    listEl.appendChild(empty);
  }
}

renderTotaux();
renderFiliereButtons();
renderList();
