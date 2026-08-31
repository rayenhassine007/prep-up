import data from './data/chapitres_concours_mp.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Chapitres du concours : filière MP.
//
// Pour mettre à jour : remplace src/data/chapitres_concours_mp.json.
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

// Coefficient décroissant ; à égalité, l'ordre du fichier est conservé.
const EPREUVES = Object.entries(data.epreuves)
  .sort((a, b) => b[1].coefficient - a[1].coefficient);

// Une classe CSS par bande, pour éviter de fabriquer un nom à partir d'un
// libellé accentué.
const BANDES = {
  'incontournable': 'b-incontournable',
  'très régulier': 'b-tres-regulier',
  'régulier': 'b-regulier',
  'variable': 'b-variable',
  'rare': 'b-rare',
  'jamais rencontré': 'b-jamais',
};

const state = { epreuve: EPREUVES[0][0] };

const tabsEl = document.getElementById('chap-tabs');
const panelEl = document.getElementById('chap-panel');

// Les libellés du programme portent parfois « (1re année) » / « (2e année) »
// pour distinguer deux chapitres homonymes. On ne les affiche pas. Le nettoyage
// se fait ici, à l'affichage, et pas dans le fichier de données : celui-ci
// reste fidèle à la source, et un JSON régénéré depuis les CSV, qui les
// contiendra de nouveau, sera nettoyé sans intervention.
const ANNEE_SUFFIXE = /\s*\((?:1re|1ère|2e|2ème)\s+ann[ée]e\)/g;

function propre(s) {
  return String(s ?? '').replace(ANNEE_SUFFIXE, '');
}

function nomDe(c) {
  return propre(c.sous_chapitre || c.chapitre);
}

// Une fois les suffixes retirés, deux chapitres distincts peuvent porter le
// même nom. Quand tout ce qui est affiché est identique, la seconde ligne
// n'apprendrait rien : on ne la garde pas.
function sansDoublons(chapitres) {
  const vus = new Set();
  return chapitres.filter((c) => {
    const cle = `${nomDe(c)}|${c.sessions_ou_present}|${c.regularite}|${propre(c.chapitre_parent)}`;
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

// Autre conséquence des suffixes retirés : un même nom peut se retrouver à la
// fois dans la liste et parmi les « jamais rencontrés », avec deux comptes
// différents. Afficher « Séries numériques 5/12 » puis « Séries numériques
// 0/12 » ne se comprend plus une fois l'année effacée : on ne garde que la
// ligne qui a été rencontrée.
function sansZeroHomonyme(jamais, rencontres) {
  const noms = new Set(rencontres.map(nomDe));
  return jamais.filter((c) => !noms.has(nomDe(c)));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const [key, e] of EPREUVES) {
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

// L'axe du dépliant : les millésimes analysés, tels que le fichier les donne
// (`annees_analysees`). À défaut, on les déduit de « 2015–2026 », et seulement
// si l'intervalle recouvre exactement le nombre de sessions annoncé.
function sessionYears(c, e) {
  if (Array.isArray(c.annees_analysees) && c.annees_analysees.length) {
    return c.annees_analysees.map(Number);
  }
  const m = String(e.annees || '').match(/(\d{4})\s*[–—-]\s*(\d{4})/);
  if (!m) return null;
  const years = [];
  for (let y = Number(m[1]); y <= Number(m[2]); y++) years.push(y);
  return years.length === e.sessions_analysees ? years : null;
}

// Pas de dépliant sans la liste des millésimes où le chapitre a été rencontré :
// « 9/12 » ne dit pas *lesquelles* des douze, et on ne les devine pas.
function presentYears(c, years) {
  if (!years || !Array.isArray(c.annees_presentes) || !c.annees_presentes.length) return null;
  return new Set(c.annees_presentes.map(Number));
}

// Dépliant « sessions » : hauteur en CSS, scale + slide + fade + ressort en JS
// (Web Animations API), pour que le mouvement soit visible à chaque clic.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN_MS = 780;
const CLOSE_MS = 480;

function clearPanelAnim(box) {
  if (box._anim) {
    box._anim.cancel();
    box._anim = null;
  }
  box.style.opacity = '';
  box.style.transform = '';
}

function closePanel(detail, toggle, box) {
  clearPanelAnim(box);
  detail.classList.remove('open', 'is-closing');
  toggle.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

function openPanel(detail, toggle, box) {
  clearPanelAnim(box);
  detail.classList.add('open');
  detail.classList.remove('is-closing');
  toggle.classList.add('open');
  toggle.setAttribute('aria-expanded', 'true');
}

function playOpen(detail, toggle, box) {
  openPanel(detail, toggle, box);
  if (REDUCED_MOTION) return;
  box._anim = box.animate([
    { opacity: 0, transform: 'scale(0.84) translateY(-18px)' },
    { opacity: 0.9, transform: 'scale(0.96) translateY(-6px)', offset: 0.4 },
    { opacity: 1, transform: 'scale(1.03) translateY(4px)', offset: 0.68 },
    { opacity: 1, transform: 'scale(0.99) translateY(-1px)', offset: 0.86 },
    { opacity: 1, transform: 'scale(1) translateY(0)' },
  ], {
    duration: OPEN_MS,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  });
  box._anim.onfinish = () => { box._anim = null; };
}

function playClose(detail, toggle, box) {
  if (REDUCED_MOTION) {
    closePanel(detail, toggle, box);
    return;
  }
  detail.classList.add('is-closing');
  clearPanelAnim(box);
  box._anim = box.animate([
    { opacity: 1, transform: 'scale(1) translateY(0)' },
    { opacity: 0, transform: 'scale(0.86) translateY(-14px)' },
  ], {
    duration: CLOSE_MS,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    fill: 'forwards',
  });
  box._anim.onfinish = () => closePanel(detail, toggle, box);
}

function wirePanelToggle(detail, toggle) {
  const box = detail.querySelector('.chap-detail-box');
  toggle.addEventListener('click', () => {
    if (detail.classList.contains('open')) playClose(detail, toggle, box);
    else playOpen(detail, toggle, box);
  });
}

// Trois niveaux côté CSS : `.chap-detail` (hauteur), `.chap-detail-clip` (rogne),
// `.chap-detail-box` (carte animée en JS). Cf. la feuille de style.
function buildDetail(c, years, present) {
  const wrap = el('div', 'chap-detail');
  const clip = el('div', 'chap-detail-clip');
  const box = el('div', 'chap-detail-box');
  box.appendChild(el('div', 'chap-detail-title', 'Sessions où le chapitre a été rencontré'));

  const grid = el('div', 'chap-years');
  for (const y of years) {
    const on = present.has(y);
    const cell = el('div', 'chap-year' + (on ? ' is-on' : ''));
    cell.setAttribute('aria-label', on ? `${y} : rencontré` : `${y} : non rencontré`);
    const mark = el('span', 'cy-mark', on ? '✓' : '–');
    mark.setAttribute('aria-hidden', 'true');
    cell.appendChild(mark);
    cell.appendChild(el('span', 'cy-num', String(y)));
    grid.appendChild(cell);
  }
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
    const toggle = el('button', 'chap-toggle', '▾');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Voir les sessions de « ${nomDe(c)} »`);
    wirePanelToggle(detail, toggle);
    row.appendChild(toggle);
    row.appendChild(detail);
  }

  return row;
}

function renderPanel() {
  const e = data.epreuves[state.epreuve];
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

renderTabs();
renderPanel();
