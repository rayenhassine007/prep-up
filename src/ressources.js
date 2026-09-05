import data from './data/ressources.json' with { type: 'json' };
import { iconEl } from './icons.js';
import {
  RECENT_MAX,
  isFavInList,
  keyOf,
  validateProposal,
  matchesSearchItem,
  noteOpenedInList,
  parseStoredList,
  snapshot,
  toggleFavInList,
} from './lib/ressources-logic.js';

// ---------------------------------------------------------------------------
// Pour ajouter des ressources : édite src/data/ressources.json
// Structure : filieres > MP/PC/PT/BG > "1ère année"/"2ème année" > [ { matiere, items } ]
// Chaque item : { "titre": "...", "type": "Drive|MEGA|PDF",
//                 "url": "https://..." ou "/sources/fichier.pdf" }
// Email de réception des propositions : champ "submitEmail" en haut du JSON.
// ---------------------------------------------------------------------------

const FILIERES = Object.keys(data.filieres);

// --- favoris & récemment ouverts (localStorage, propre à l'appareil) ---
const FAV_KEY = 'prepup:favoris';
const RECENT_KEY = 'prepup:recents';

// A favourite is a *document*, identified by its URL. The same Drive link is
// deliberately listed under several filières/matières (63 of them are), so
// starring it once saves it once, and every row pointing at it must show the
// same state, which is what syncStars() below takes care of.

function loadList(storageKey) {
  try {
    return parseStoredList(localStorage.getItem(storageKey));
  } catch (e) { return []; } // private mode / corrupted value: behave as empty
}
function saveList(storageKey, list) {
  try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch (e) {}
}

const state = {
  filiere: FILIERES[0],
  annee: Object.keys(data.filieres[FILIERES[0]])[0],
  search: '',
  view: 'tous', // tous | favoris | recents
  favoris: loadList(FAV_KEY),
  recents: loadList(RECENT_KEY),
};

const VIEWS = [
  ['tous', 'Toutes'],
  ['favoris', '★ Favoris'],
  ['recents', 'Récemment ouvert'],
];

function isFav(item) {
  return isFavInList(state.favoris, item);
}

function toggleFav(item, ctx) {
  state.favoris = toggleFavInList(state.favoris, item, ctx);
  saveList(FAV_KEY, state.favoris);
}

function noteOpened(item, ctx) {
  state.recents = noteOpenedInList(state.recents, item, ctx, RECENT_MAX);
  saveList(RECENT_KEY, state.recents);
}

const filiereSelectEl = document.getElementById('filiere-select');
const anneeSelectEl = document.getElementById('annee-select');
const listEl = document.getElementById('res-list');
const searchEl = document.getElementById('res-search');
const submitLinkEl = document.getElementById('submit-link');
const viewsEl = document.getElementById('res-views');

// --- modal de proposition (charte + formulaire lien OU PDF) ---
const modalEl = document.getElementById('submit-modal');
const modalCancelEl = document.getElementById('modal-cancel');
const submitFormEl = document.getElementById('submit-form');
const submitLienEl = document.getElementById('submit-lien');
const submitFichierEl = document.getElementById('submit-fichier');
const submitFiliereEl = document.getElementById('submit-filiere');
const submitAnneeEl = document.getElementById('submit-annee');
const submitErrorEl = document.getElementById('submit-error');

submitLinkEl.addEventListener('click', () => {
  submitErrorEl.hidden = true;
  if (submitFiliereEl && FILIERES.includes(state.filiere)) {
    submitFiliereEl.value = state.filiere;
  }
  if (submitAnneeEl && state.annee) {
    submitAnneeEl.value = state.annee;
  }
  modalEl.showModal();
});
modalCancelEl.addEventListener('click', () => modalEl.close());
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) modalEl.close();
});

if (data.submitEmail) {
  submitFormEl.dataset.ajaxEndpoint = `https://formsubmit.co/ajax/${encodeURIComponent(data.submitEmail)}`;
  submitFormEl.dataset.postEndpoint = `https://formsubmit.co/${encodeURIComponent(data.submitEmail)}`;
} else {
  const btn = document.getElementById('modal-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Formulaire bientôt disponible';
  }
}

function clearSubmitError() {
  submitErrorEl.hidden = true;
}
submitLienEl.addEventListener('input', clearSubmitError);
submitFichierEl.addEventListener('change', clearSubmitError);
submitFiliereEl?.addEventListener('change', clearSubmitError);
submitAnneeEl?.addEventListener('change', clearSubmitError);

function showSubmitThanks() {
  submitLinkEl.closest('.submit-card')?.querySelector('.submit-thanks')?.remove();
  const note = document.createElement('p');
  note.className = 'submit-thanks';
  note.setAttribute('role', 'status');
  note.textContent = 'Merci : ta proposition a bien été envoyée. Elle sera vérifiée avant publication.';
  submitLinkEl.closest('.submit-card')?.prepend(note);
}

const submitBtnEl = document.getElementById('modal-submit');
const MAX_PDF_BYTES = 10 * 1024 * 1024;

submitFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();

  const result = validateProposal(submitLienEl.value, submitFichierEl.files, {
    filiere: submitFiliereEl?.value,
    annee: submitAnneeEl?.value,
  });
  if (!result.ok) {
    const messages = {
      'missing-meta': 'Choisis une filière et une année.',
      'invalid-link': 'Le lien doit être une URL valide (Drive, MEGA, etc.).',
      missing: 'Ajoute un lien valide ou un fichier PDF pour pouvoir envoyer.',
    };
    submitErrorEl.textContent = messages[result.reason] || messages.missing;
    submitErrorEl.hidden = false;
    if (result.reason === 'missing-meta') {
      (submitFiliereEl?.value ? submitAnneeEl : submitFiliereEl)?.focus();
    } else {
      submitLienEl.focus();
    }
    return;
  }

  const titreEl = document.getElementById('submit-titre');
  if (titreEl && !String(titreEl.value || '').trim()) {
    submitErrorEl.textContent = 'Indique le titre du document.';
    submitErrorEl.hidden = false;
    titreEl.focus();
    return;
  }

  const hasFile = !!(submitFichierEl.files && submitFichierEl.files.length > 0);
  if (hasFile && submitFichierEl.files[0].size > MAX_PDF_BYTES) {
    submitErrorEl.textContent = 'Le PDF doit faire moins de 10 Mo. Mets-le sur Drive/MEGA et colle le lien.';
    submitErrorEl.hidden = false;
    submitFichierEl.focus();
    return;
  }

  const ajaxEndpoint = submitFormEl.dataset.ajaxEndpoint;
  const postEndpoint = submitFormEl.dataset.postEndpoint;
  if (!ajaxEndpoint || !postEndpoint) return;

  if (submitBtnEl) {
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = 'Envoi...';
  }
  submitErrorEl.hidden = true;

  // FormSubmit's AJAX endpoint often drops file attachments.
  // Classic POST keeps the PDF attached, then _next brings the user back here.
  if (hasFile) {
    submitFormEl.action = postEndpoint;
    submitFormEl.method = 'POST';
    submitFormEl.enctype = 'multipart/form-data';
    submitFormEl.submit(); // native submit: does not re-fire this listener
    return;
  }

  try {
    const body = new FormData(submitFormEl);
    body.delete('_next');
    body.delete('attachment'); // empty file field not needed for link-only
    const res = await fetch(ajaxEndpoint, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try {
      const payload = await res.json();
      if (payload && payload.success === false) throw new Error('submit failed');
    } catch (parseErr) {
      if (!(parseErr instanceof SyntaxError)) throw parseErr;
    }

    submitFormEl.reset();
    modalEl.close();
    showSubmitThanks();
  } catch {
    submitErrorEl.textContent = "L'envoi a échoué. Réessaie dans un instant.";
    submitErrorEl.hidden = false;
  } finally {
    if (submitBtnEl) {
      submitBtnEl.disabled = false;
      submitBtnEl.textContent = 'Envoyer';
    }
  }
});

if (new URLSearchParams(location.search).get('envoye') === '1') {
  showSubmitThanks();
  history.replaceState({}, '', location.pathname);
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
  return matchesSearchItem(item, matiere, state.search);
}

function renderViewButtons() {
  if (!viewsEl) return;
  viewsEl.innerHTML = '';
  for (const [key, label] of VIEWS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const count = key === 'favoris' ? state.favoris.length : key === 'recents' ? state.recents.length : 0;
    btn.textContent = count ? `${label} (${count})` : label;
    btn.className = 'res-view' + (key === state.view ? ' active' : '');
    btn.addEventListener('click', () => {
      state.view = key;
      renderAll();
    });
    viewsEl.appendChild(btn);
  }
}

// One row, shared by all three views. `ctx` carries the filière/année/matière the
// item lives under so a favourite still knows where it came from.
function buildRow(item, ctx, opts = {}) {
  const isLive = Boolean(item.url);
  const row = document.createElement(isLive ? 'a' : 'div');
  row.className = 'res-item' + (isLive ? ' live' : '');
  if (isLive) {
    row.href = item.url;
    row.target = '_blank';
    row.rel = 'noopener';
    row.addEventListener('click', () => {
      noteOpened(item, ctx);
      renderViewButtons(); // refresh the "Récemment ouvert" counter
    });
  }

  const name = document.createElement('span');
  name.className = 'res-name';
  name.textContent = item.titre;

  const meta = document.createElement('span');
  meta.className = 'res-meta';
  if (opts.withContext) {
    const bits = [ctx.filiere, ctx.annee, ctx.matiere].filter(Boolean);
    if (bits.length) meta.append(document.createTextNode(bits.join(' · ') + ' · '));
  }
  if (isLive) {
    if (item.type) meta.append(document.createTextNode(item.type + ' '));
    meta.appendChild(iconEl('i-external', 'icon'));
  } else {
    meta.append(document.createTextNode([item.type, 'Bientôt'].filter(Boolean).join(' · ')));
  }

  row.appendChild(name);
  row.appendChild(meta);

  if (isLive) {
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'res-fav';
    star.dataset.url = item.url;
    paintStar(star, isFav(item));
    star.addEventListener('click', (e) => {
      e.preventDefault();  // the row is a link, so don't follow it
      e.stopPropagation();
      toggleFav(item, ctx);
      if (state.view === 'favoris') {
        renderAll(); // un-starring here removes the row, so rebuild
      } else {
        // update in place: rebuilding the list would jump the scroll position
        syncStars(item.url, isFav(item));
        renderViewButtons();
      }
    });
    row.appendChild(star);
  }

  return row;
}

function paintStar(star, on) {
  star.classList.toggle('on', on);
  star.textContent = on ? '★' : '☆';
  star.title = on ? 'Retirer des favoris' : 'Ajouter aux favoris';
  star.setAttribute('aria-label', star.title);
}

// The same document can be listed in several places; keep every one of its
// stars in step with the one that was just clicked.
function syncStars(url, on) {
  listEl.querySelectorAll('.res-fav').forEach((s) => {
    if (s.dataset.url === url) paintStar(s, on);
  });
}

function renderBrowseView() {
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

    const ctx = { matiere: group.matiere, filiere: state.filiere, annee: state.annee };
    for (const item of items) card.appendChild(buildRow(item, ctx));

    listEl.appendChild(card);
  }
}

function renderSavedView(entries, { title, emptyText, clearLabel, storageKey }) {
  const card = document.createElement('div');
  card.className = 'res-group';

  const head = document.createElement('div');
  head.className = 'res-matiere res-saved-head';
  const label = document.createElement('span');
  label.textContent = title;
  head.appendChild(label);

  if (entries.length) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'res-clear';
    clear.textContent = clearLabel;
    clear.addEventListener('click', () => {
      if (storageKey === FAV_KEY) state.favoris = [];
      else state.recents = [];
      saveList(storageKey, []);
      renderAll();
    });
    head.appendChild(clear);
  }
  card.appendChild(head);

  const shown = entries.filter((e) => matchesSearch(e, e.matiere || ''));

  if (shown.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'reach-empty';
    empty.textContent = entries.length ? 'Aucun résultat.' : emptyText;
    card.appendChild(empty);
  }

  for (const e of shown) {
    const ctx = { matiere: e.matiere, filiere: e.filiere, annee: e.annee };
    card.appendChild(buildRow(e, ctx, { withContext: true }));
  }

  listEl.appendChild(card);
}

function renderList() {
  listEl.innerHTML = '';

  // the filière/année pickers only make sense while browsing
  const browsing = state.view === 'tous';
  if (filiereSelectEl) filiereSelectEl.classList.toggle('is-hidden', !browsing);
  if (anneeSelectEl) anneeSelectEl.classList.toggle('is-hidden', !browsing);

  if (browsing) {
    renderBrowseView();
    if (listEl.children.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'reach-empty';
      empty.textContent = 'Aucun résultat.';
      listEl.appendChild(empty);
    }
    return;
  }

  if (state.view === 'favoris') {
    renderSavedView(state.favoris, {
      title: '★ Mes favoris',
      emptyText: "Aucun favori pour l'instant : touche l'étoile d'une ressource pour l'ajouter ici.",
      clearLabel: 'Tout retirer',
      storageKey: FAV_KEY,
    });
  } else {
    renderSavedView(state.recents, {
      title: 'Récemment ouvert',
      emptyText: 'Rien pour le moment : les ressources que tu ouvres apparaîtront ici.',
      clearLabel: 'Effacer',
      storageKey: RECENT_KEY,
    });
  }
}

function renderAll() {
  renderViewButtons();
  renderFiliereButtons();
  renderAnneeButtons();
  renderList();
}

renderAll();
