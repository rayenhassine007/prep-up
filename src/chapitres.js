import mp from './data/chapitres_concours_mp.json' with { type: 'json' };
import t from './data/chapitres_concours_t.json' with { type: 'json' };
import { iconEl } from './icons.js';
import {
  ANNEE_SUFFIXE,
  BANDES,
  nomDe,
  presentYears,
  propre,
  sansDoublons,
  sansZeroHomonyme,
  sessionYears,
  sortEpreuves,
} from './lib/chapitres-logic.js';

// ---------------------------------------------------------------------------
// Chapitres du concours : une filière à la fois.
//
// Pour ajouter une filière : dépose son JSON dans src/data/, importe-le et
// ajoute une entrée à FILIERES. Rien d'autre à toucher.
// Pour mettre à jour une filière : remplace son fichier de données.
// Structure : meta + epreuves > <clé> > { epreuve, court, coefficient,
//   sessions_analysees, annees, seuil_presence_questions, niveau, chapitres: [...] }
// Chaque chapitre : { chapitre | sous_chapitre, chapitre_parent?, annee_programme,
//   annee_label, heures, sessions_ou_present, sessions_analysees, regularite,
//   annees_presentes: [...], annees_analysees: [...] }
//
// Les heures sont dans les données mais ne sont pas affichées : elles sont
// estimées en physique, et une colonne présente sur trois épreuves seulement
// invite à des comparaisons que ces chiffres ne supportent pas.
//
// L'ordre d'affichage des chapitres est celui du fichier (fréquence
// décroissante) : ni tri ni filtre, la liste se lit telle quelle.
// ---------------------------------------------------------------------------

// L'ordre des boutons de filière est celui de cette liste.
const FILIERES = [
  ['MP', mp],
  ['T', t],
];

// Coefficient décroissant ; à égalité, l'ordre du fichier est conservé.
function epreuvesDe(filiere) {
  return sortEpreuves(dataDe(filiere).epreuves);
}

function dataDe(filiere) {
  return FILIERES.find(([nom]) => nom === filiere)[1];
}

// Une classe CSS par bande, pour éviter de fabriquer un nom à partir d'un
// libellé accentué.

const state = { filiere: FILIERES[0][0], epreuve: epreuvesDe(FILIERES[0][0])[0][0] };

const filieresEl = document.getElementById('chap-filieres');
const tabsEl = document.getElementById('chap-tabs');
const panelEl = document.getElementById('chap-panel');

// Les libellés du programme portent parfois « (1re année) » / « (2e année) »
// pour distinguer deux chapitres homonymes. On ne les affiche pas. Le nettoyage
// se fait ici, à l'affichage, et pas dans le fichier de données : celui-ci
// reste fidèle à la source, et un JSON régénéré depuis les CSV, qui les
// contiendra de nouveau, sera nettoyé sans intervention.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderFilieres() {
  if (!filieresEl) return;
  filieresEl.innerHTML = '';
  for (const [nom] of FILIERES) {
    const btn = el('button', nom === state.filiere ? 'active' : '', nom);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(nom === state.filiere));
    btn.addEventListener('click', () => {
      if (state.filiere === nom) return;
      state.filiere = nom;
      // chaque filière a ses propres épreuves : on repart de la première
      state.epreuve = epreuvesDe(nom)[0][0];
      renderFilieres();
      renderTabs();
      renderPanel();
    });
    filieresEl.appendChild(btn);
  }
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const [key, e] of epreuvesDe(state.filiere)) {
    const btn = el('button', 'chap-tab' + (key === state.epreuve ? ' active' : ''));
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(key === state.epreuve));
    btn.appendChild(el('span', 'chap-tab-name', e.court));
    btn.appendChild(el('span', 'chap-tab-coef', 'coef ' + e.coefficient));
    btn.addEventListener('click', () => {
      if (state.epreuve === key) return;
      state.epreuve = key;
      renderTabs();
      renderPanel();
    });
    tabsEl.appendChild(btn);
  }
}

// Dépliant « sessions » : panneau scale/fade/glisse (`.is-animating`). Les années
// apparaissent avec le panneau, pas en cascade.
function closePanel(detail, toggle) {
  detail.classList.remove('open', 'is-animating', 'is-closing');
  toggle.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

function openPanel(detail, toggle) {
  detail.classList.remove('is-closing');
  detail.classList.add('open');
  toggle.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
}

function replayOpenAnim(detail, box) {
  detail.classList.remove('is-animating');
  void box.offsetWidth;
  detail.classList.add('is-animating');
  const done = (e) => {
    if (e.target !== box || e.animationName !== 'chap-drop-open') return;
    box.removeEventListener('animationend', done);
    detail.classList.remove('is-animating');
  };
  box.addEventListener('animationend', done);
}

function playOpen(detail, toggle, box) {
  openPanel(detail, toggle);
  replayOpenAnim(detail, box);
}

function playClose(detail, toggle, box) {
  detail.classList.remove('is-animating');
  detail.classList.add('is-closing');
  const done = (e) => {
    if (e.target !== box || e.animationName !== 'chap-drop-close') return;
    box.removeEventListener('animationend', done);
    closePanel(detail, toggle);
  };
  box.addEventListener('animationend', done);
}

function wirePanelToggle(detail, toggle) {
  const box = detail.querySelector('.chap-detail-box');
  toggle.addEventListener('click', () => {
    if (detail.classList.contains('open') && !detail.classList.contains('is-closing')) {
      playClose(detail, toggle, box);
    } else if (!detail.classList.contains('open')) {
      playOpen(detail, toggle, box);
    }
  });
}

// Trois niveaux côté CSS : `.chap-detail` (hauteur), `.chap-detail-clip` (rogne),
// `.chap-detail-box` (menu déroulant). Cf. main.css.
function buildDetail(c, years, present) {
  const wrap = el('div', 'chap-detail');
  const clip = el('div', 'chap-detail-clip');
  const box = el('div', 'chap-detail-box');
  box.appendChild(el('div', 'chap-detail-title', 'Sessions où le chapitre a été rencontré'));

  const grid = el('div', 'chap-years');
  years.forEach((y) => {
    const on = present.has(y);
    const cell = el('div', 'chap-year' + (on ? ' is-on' : ''));
    cell.setAttribute('aria-label', on ? `${y} : rencontré` : `${y} : non rencontré`);
    const mark = el('span', 'cy-mark');
    if (on) mark.appendChild(iconEl('i-check', 'icon'));
    else mark.textContent = '–';
    mark.setAttribute('aria-hidden', 'true');
    cell.appendChild(mark);
    cell.appendChild(el('span', 'cy-num', String(y)));
    grid.appendChild(cell);
  });
  box.appendChild(grid);
  clip.appendChild(box);
  wrap.appendChild(clip);
  return wrap;
}

function buildRow(c, e) {
  const row = el('div', 'chap-item');

  const main = el('div', 'chap-main');
  main.appendChild(el('span', 'chap-name', nomDe(c)));
  // Seule la physique a une seconde ligne : le chapitre parent, puisque son
  // tableau est au niveau sous-chapitre. Les autres épreuves n'en ont pas.
  if (e.niveau === 'sous-chapitre' && c.chapitre_parent) {
    const sub = el('span', 'chap-sub');
    sub.appendChild(el('span', 'chap-parent', propre(c.chapitre_parent)));
    main.appendChild(sub);
  }
  row.appendChild(main);

  row.appendChild(el('span', 'chap-count', `${c.sessions_ou_present}/${c.sessions_analysees}`));

  const badge = el('span', 'freq-badge ' + (BANDES[c.regularite] || 'b-rare'), c.regularite);
  row.appendChild(badge);

  const bar = el('div', 'chap-bar');
  const fill = el('span', 'chap-bar-fill ' + (BANDES[c.regularite] || 'b-rare'));
  const pct = c.sessions_analysees
    ? (c.sessions_ou_present / c.sessions_analysees) * 100
    : 0;
  fill.style.width = pct + '%';
  bar.appendChild(fill);
  bar.setAttribute('aria-hidden', 'true'); // le compte X/N dit déjà la même chose
  row.appendChild(bar);

  const years = sessionYears(c, e);
  const present = presentYears(c, years);
  if (present) {
    const detail = buildDetail(c, years, present);
    const toggle = el('button', 'chap-toggle');
    toggle.type = 'button';
    toggle.appendChild(iconEl('i-chevron-down', 'icon'));
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Voir les sessions de « ${nomDe(c)} »`);
    wirePanelToggle(detail, toggle);
    row.appendChild(toggle);
    row.appendChild(detail);
  }

  return row;
}

function renderPanel() {
  const e = dataDe(state.filiere).epreuves[state.epreuve];
  panelEl.innerHTML = '';

  const card = el('section', 'chap-card');

  const head = el('div', 'chap-head');
  head.appendChild(el('h2', 'chap-title', e.epreuve));
  const meta = el('div', 'chap-meta');
  const bits = [
    `coefficient ${e.coefficient}`,
    `${e.sessions_analysees} sessions (${e.annees})`,
    `seuil de présence : ≥ ${e.seuil_presence_questions} question${e.seuil_presence_questions > 1 ? 's' : ''}`,
  ];
  for (const b of bits) meta.appendChild(el('span', 'chap-chip', b));
  head.appendChild(meta);
  card.appendChild(head);

  const rencontres = sansDoublons(e.chapitres.filter((c) => c.sessions_ou_present > 0));
  const jamais = sansZeroHomonyme(
    sansDoublons(e.chapitres.filter((c) => c.sessions_ou_present === 0)),
    rencontres,
  );

  const list = el('div', 'chap-list');
  for (const c of rencontres) list.appendChild(buildRow(c, e));
  card.appendChild(list);

  if (jamais.length) {
    const det = el('details', 'chap-never');
    const sum = el('summary', null,
      `Voir les ${jamais.length} chapitre${jamais.length > 1 ? 's' : ''} jamais rencontré${jamais.length > 1 ? 's' : ''}`);
    det.appendChild(sum);
    const inner = el('div', 'chap-list');
    for (const c of jamais) inner.appendChild(buildRow(c, e));
    det.appendChild(inner);
    card.appendChild(det);
  }

  panelEl.appendChild(card);
}

renderFilieres();
renderTabs();
renderPanel();
