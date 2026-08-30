import data from './data/chapitres_concours_mp.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Chapitres du concours — filière MP.
//
// Pour mettre à jour : remplace src/data/chapitres_concours_mp.json.
// Structure : meta + epreuves > <clé> > { epreuve, court, coefficient,
//   sessions_analysees, annees, seuil_presence_questions, niveau,
//   analyse: [...], reserve?, chapitres: [...] }
// Chaque chapitre : { chapitre | sous_chapitre, chapitre_parent?, annee_programme,
//   annee_label, heures, sessions_ou_present, sessions_analysees, regularite }
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

function nomDe(c) {
  return c.sous_chapitre || c.chapitre;
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

// Les millésimes des sessions analysées, déduits de « 2015–2026 ». On ne les
// utilise que si l'intervalle recouvre exactement le nombre de sessions
// annoncé : sinon on ne sait pas à quelle année correspond quoi.
function sessionYears(e) {
  const m = String(e.annees || '').match(/(\d{4})\s*[–—-]\s*(\d{4})/);
  if (!m) return null;
  const years = [];
  for (let y = Number(m[1]); y <= Number(m[2]); y++) years.push(y);
  return years.length === e.sessions_analysees ? years : null;
}

// Le détail session par session n'existe que si le fichier de données porte,
// pour ce chapitre, la liste des millésimes où il a été rencontré
// (`sessions_presentes: [2019, 2020, ...]`). Sans elle, pas de dépliant :
// on n'a aucun moyen de deviner *lesquelles* des N sessions comptées.
function presentYears(c, years) {
  if (!years || !Array.isArray(c.sessions_presentes)) return null;
  const set = new Set(c.sessions_presentes.map(Number));
  return years.some((y) => set.has(y)) ? set : null;
}

function buildDetail(c, years, present) {
  const wrap = el('div', 'chap-detail');
  wrap.hidden = true;
  wrap.appendChild(el('div', 'chap-detail-title', 'Sessions où le chapitre a été rencontré'));

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
  wrap.appendChild(grid);
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
    sub.appendChild(el('span', 'chap-parent', c.chapitre_parent));
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

  const years = sessionYears(e);
  const present = presentYears(c, years);
  if (present) {
    const detail = buildDetail(c, years, present);
    const toggle = el('button', 'chap-toggle', '▾');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Voir les sessions de « ${nomDe(c)} »`);
    toggle.addEventListener('click', () => {
      const open = detail.hidden;
      detail.hidden = !open;
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
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
    `niveau ${e.niveau}`,
  ];
  for (const b of bits) meta.appendChild(el('span', 'chap-chip', b));
  head.appendChild(meta);
  card.appendChild(head);

  const rencontres = e.chapitres.filter((c) => c.sessions_ou_present > 0);
  const jamais = e.chapitres.filter((c) => c.sessions_ou_present === 0);

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
