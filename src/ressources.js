import data from './data/ressources.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Pour ajouter des ressources : édite src/data/ressources.json
// Structure : filieres > MP/PC/PT/BG > "1ère année"/"2ème année" > [ { matiere, items } ]
// Chaque item : { "titre": "...", "type": "Drive|MEGA|PDF",
//                 "url": "https://..." ou "/sources/fichier.pdf" }
// Le lien du formulaire de proposition : champ "formUrl" en haut du JSON.
// ---------------------------------------------------------------------------

const FILIERES = Object.keys(data.filieres);

const state = {
  filiere: FILIERES[0],
  annee: Object.keys(data.filieres[FILIERES[0]])[0],
  search: '',
};

const filiereSelectEl = document.getElementById('filiere-select');
const anneeSelectEl = document.getElementById('annee-select');
const listEl = document.getElementById('res-list');
const searchEl = document.getElementById('res-search');
const submitLinkEl = document.getElementById('submit-link');

// --- modal de proposition (charte + formulaire) ---
const modalEl = document.getElementById('submit-modal');
const modalCancelEl = document.getElementById('modal-cancel');
const modalContinueEl = document.getElementById('modal-continue');

submitLinkEl.addEventListener('click', () => modalEl.showModal());
modalCancelEl.addEventListener('click', () => modalEl.close());
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) modalEl.close();
});

if (data.formUrl) {
  modalContinueEl.href = data.formUrl;
} else {
  modalContinueEl.classList.add('disabled');
  modalContinueEl.textContent = 'Formulaire bientôt disponible';
  modalContinueEl.addEventListener('click', (e) => e.preventDefault());
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
      if (!data.filieres[f][state.annee]) {
        state.annee = Object.keys(data.filieres[f])[0];
      }
      renderFiliereButtons();
      renderAnneeButtons();
      renderList();
    });
    filiereSelectEl.appendChild(btn);
  }
}

function renderAnneeButtons() {
  anneeSelectEl.innerHTML = '';
  for (const a of Object.keys(data.filieres[state.filiere])) {
    const btn = document.createElement('button');
    btn.textContent = a;
    btn.className = a === state.annee ? 'active' : '';
    btn.addEventListener('click', () => {
      state.annee = a;
      renderAnneeButtons();
      renderList();
    });
    anneeSelectEl.appendChild(btn);
  }
}

function matchesSearch(item, matiere) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return (
    item.titre.toLowerCase().includes(q) ||
    (item.type || '').toLowerCase().includes(q) ||
    matiere.toLowerCase().includes(q)
  );
}

function renderList() {
  listEl.innerHTML = '';
  const groups = data.filieres[state.filiere][state.annee] || [];

  for (const group of groups) {
    const items = (group.items || []).filter((it) => matchesSearch(it, group.matiere));
    if (items.length === 0 && state.search.trim()) continue;

    const card = document.createElement('div');
    card.className = 'res-group';

    const title = document.createElement('div');
    title.className = 'res-matiere';
    title.textContent = group.matiere;
    card.appendChild(title);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'reach-empty';
      empty.textContent = 'Aucun document pour le moment.';
      card.appendChild(empty);
    }

    for (const item of items) {
      const isLive = Boolean(item.url);
      const row = document.createElement(isLive ? 'a' : 'div');
      row.className = 'res-item' + (isLive ? ' live' : '');
      if (isLive) {
        row.href = item.url;
        row.target = '_blank';
        row.rel = 'noopener';
      }

      const name = document.createElement('span');
      name.className = 'res-name';
      name.textContent = item.titre;

      const meta = document.createElement('span');
      meta.className = 'res-meta';
      meta.textContent = isLive ? (item.type ? item.type + ' ↗' : '↗') : [item.type, 'Bientôt'].filter(Boolean).join(' · ');

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

renderFiliereButtons();
renderAnneeButtons();
renderList();
