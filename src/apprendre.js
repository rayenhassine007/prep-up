// Page « Apprendre à apprendre » : le texte français est dans le HTML (lisible
// sans JS et par les moteurs de recherche). Ce module ajoute le bouton de
// langue (français / arabe), le test rapide et le planificateur de révisions.
// Ce que la personne note reste dans son navigateur (localStorage) ; si le
// stockage est bloqué, la page marche quand même et oublie au rechargement.

import { morceaux, t } from './lib/apprendre-i18n.js';
import {
  QUESTIONS,
  aReviser,
  basculerRevision,
  dateDuJour,
  dateLisible,
  langueInitiale,
  notionsValides,
  nouvelleNotion,
  questionsRestantes,
  reponsesValides,
  resultatQuiz,
} from './lib/apprendre-logic.js';

const CLE_LANGUE = 'pu-aa-langue';
const CLE_QUIZ = 'pu-aa-quiz';
const CLE_PLAN = 'pu-aa-plan';

function lire(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}
function lireJson(cle) {
  try {
    return JSON.parse(lire(cle));
  } catch {
    return null;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

let langue = langueInitiale(location.search, lire(CLE_LANGUE));
const tr = (cle, vars) => t(langue, cle, vars);

// ---------------------------------------------------------------------------
// Langue
// ---------------------------------------------------------------------------

// La police arabe n'est chargée que si quelqu'un passe en arabe.
function chargerPoliceArabe() {
  if (document.getElementById('aa-police-ar')) return;
  const lien = document.createElement('link');
  lien.id = 'aa-police-ar';
  lien.rel = 'stylesheet';
  lien.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap';
  document.head.appendChild(lien);
}

// Un texte à marqueurs devient du texte et de vrais éléments, sans innerHTML.
function remplirRiche(noeud) {
  const texte = tr(noeud.dataset.i18nRiche);
  const enfants = morceaux(texte).map((m) => {
    if (typeof m === 'string') return document.createTextNode(m);
    if (m.marqueur === 'cours') return el('em', null, 'Learning How to Learn');
    const a = el('a', 'inline-link', tr(noeud.dataset.lienCle));
    a.href = noeud.dataset.lien;
    if (noeud.dataset.lienExterne) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    return a;
  });
  noeud.replaceChildren(...enfants);
}

function appliquerLangue() {
  const html = document.documentElement;
  html.lang = langue;
  html.dir = langue === 'ar' ? 'rtl' : 'ltr';
  if (langue === 'ar') chargerPoliceArabe();
  document.title = tr('meta.titre');

  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = tr(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-riche]').forEach(remplirRiche);
  document.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', tr(n.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach((n) => { n.placeholder = tr(n.dataset.i18nPlaceholder); });

  // Les boutons sont écrits dans l'autre langue : on le leur dit.
  boutonsLangue.forEach((b) => { b.lang = langue === 'ar' ? 'fr' : 'ar'; });

  rendreQuiz();
  rendrePlan();
  html.classList.remove('aa-attente');
}

// Deux boutons : dans l'en-tête sur grand écran, rond dans la barre collante
// sur téléphone. Le CSS n'en montre qu'un à la fois.
const boutonsLangue = document.querySelectorAll('.aa-langue');
function changerLangue() {
  langue = langue === 'ar' ? 'fr' : 'ar';
  ecrire(CLE_LANGUE, langue);
  // L'adresse suit le choix, pour qu'un lien partagé ouvre la même langue.
  const url = new URL(location.href);
  if (langue === 'ar') url.searchParams.set('lang', 'ar');
  else url.searchParams.delete('lang');
  history.replaceState(history.state, '', url);
  appliquerLangue();
}
boutonsLangue.forEach((b) => b.addEventListener('click', changerLangue));

// ---------------------------------------------------------------------------
// Test rapide
// ---------------------------------------------------------------------------

const quizEl = document.getElementById('aa-quiz');
const resteEl = document.getElementById('aa-quiz-reste');
const resultatEl = document.getElementById('aa-quiz-resultat');
let reponses = reponsesValides(lireJson(CLE_QUIZ));

for (const [id, valeur] of Object.entries(reponses)) {
  const input = quizEl.querySelector(`input[name="${id}"][value="${valeur}"]`);
  if (input) input.checked = true;
}

// Aller à une méthode et la faire clignoter un instant.
function montrerMethode(n) {
  const carte = document.getElementById(`methode-${n}`);
  if (!carte) return;
  const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  carte.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'center' });
  carte.focus({ preventScroll: true });
  carte.classList.remove('aa-eclair');
  void carte.offsetWidth; // relance l'animation si on reclique
  carte.classList.add('aa-eclair');
  setTimeout(() => carte.classList.remove('aa-eclair'), 2200);
}

function rendreQuiz() {
  const res = resultatQuiz(reponses);
  if (!res) {
    const n = questionsRestantes(reponses);
    resteEl.textContent = n < QUESTIONS.length ? tr(n === 1 ? 'quiz.reste1' : 'quiz.resteN', { n }) : '';
    resultatEl.hidden = true;
    return;
  }
  resteEl.textContent = '';
  resultatEl.replaceChildren();
  const ligne = el('p', 'aa-res-ligne');
  if (!res.priorites.length) {
    ligne.textContent = tr('quiz.bravo');
  } else {
    ligne.appendChild(el('strong', null, `${tr('quiz.priorites')} `));
    res.priorites.forEach((n, i) => {
      if (i) ligne.append(langue === 'ar' ? '، ' : ', ');
      const a = el('a', 'inline-link', tr('quiz.methode', { n }));
      a.href = `#methode-${n}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        montrerMethode(n);
      });
      ligne.appendChild(a);
    });
  }
  const refaire = el('button', 'aa-lien-btn', tr('quiz.refaire'));
  refaire.type = 'button';
  refaire.addEventListener('click', () => {
    quizEl.reset();
    reponses = {};
    ecrire(CLE_QUIZ, '{}');
    rendreQuiz();
    quizEl.querySelector('input')?.focus();
  });
  resultatEl.append(ligne, refaire);
  resultatEl.hidden = false;
}

quizEl.addEventListener('change', () => {
  reponses = {};
  for (const q of QUESTIONS) {
    const coche = quizEl.querySelector(`input[name="${q.id}"]:checked`);
    if (coche) reponses[q.id] = coche.value;
  }
  ecrire(CLE_QUIZ, JSON.stringify(reponses));
  rendreQuiz();
});
quizEl.addEventListener('submit', (e) => e.preventDefault());

// ---------------------------------------------------------------------------
// Planificateur de révisions
// ---------------------------------------------------------------------------

const planForm = document.getElementById('aa-plan-form');
const planNom = document.getElementById('aa-plan-nom');
const planDate = document.getElementById('aa-plan-date');
const planErreur = document.getElementById('aa-plan-erreur');
const planAujourdhui = document.getElementById('aa-plan-aujourdhui');
const planListe = document.getElementById('aa-plan-liste');

let notions = notionsValides(lireJson(CLE_PLAN));
let erreurPlan = null;

function stockageDisponible() {
  try {
    localStorage.setItem('pu-aa-test', '1');
    localStorage.removeItem('pu-aa-test');
    return true;
  } catch {
    return false;
  }
}
const stockageOk = stockageDisponible();

function sauverPlan() {
  ecrire(CLE_PLAN, JSON.stringify(notions));
}

function nouvelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function basculer(id, j) {
  notions = basculerRevision(notions, id, j);
  sauverPlan();
  rendrePlan();
}

function caseRevision(notion, r, aujourdhui) {
  const label = el('label', 'aa-rev');
  if (r.faite) label.classList.add('faite');
  else if (r.date < aujourdhui) label.classList.add('retard');
  else if (r.date === aujourdhui) label.classList.add('jour');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = r.faite;
  input.setAttribute('aria-label', `${tr('plan.fait')} : ${notion.nom}, J+${r.j}, ${dateLisible(r.date, langue)}`);
  input.addEventListener('change', () => basculer(notion.id, r.j));
  const j = el('span', 'aa-rev-j', `J+${r.j}`);
  j.dir = 'ltr';
  label.append(input, j, el('span', 'aa-rev-date', dateLisible(r.date, langue)));
  return label;
}

function rendrePlan() {
  const aujourdhui = dateDuJour();

  planErreur.hidden = !erreurPlan;
  planErreur.textContent = erreurPlan ? tr(erreurPlan) : '';
  document.getElementById('aa-plan-bloque')?.remove();
  if (!stockageOk) {
    const note = el('p', 'aa-petit aa-avertissement', tr('plan.bloque'));
    note.id = 'aa-plan-bloque';
    planForm.before(note);
  }

  planAujourdhui.replaceChildren();
  if (notions.length) {
    planAujourdhui.appendChild(el('h3', 'aa-plan-titre', tr('plan.aujourdhui')));
    const dues = aReviser(notions, aujourdhui);
    if (!dues.length) {
      planAujourdhui.appendChild(el('p', 'aa-petit', tr('plan.rien')));
    } else {
      const ul = el('ul', 'aa-dues');
      for (const d of dues) {
        const li = el('li');
        const texte = el('span', 'aa-due-texte', `${d.nom} `);
        const j = el('span', 'aa-rev-j', `J+${d.j}`);
        j.dir = 'ltr';
        texte.appendChild(j);
        if (d.enRetard) texte.append(' ', el('span', 'aa-retard', tr('plan.retard')));
        const fait = el('button', 'aa-fait', tr('plan.fait'));
        fait.type = 'button';
        fait.setAttribute('aria-label', `${tr('plan.fait')} : ${d.nom}, J+${d.j}`);
        fait.addEventListener('click', () => basculer(d.id, d.j));
        li.append(texte, fait);
        ul.appendChild(li);
      }
      planAujourdhui.appendChild(ul);
    }
  }

  planListe.replaceChildren();
  if (!notions.length) return;
  planListe.appendChild(el('h3', 'aa-plan-titre', tr('plan.chapitres')));
  for (const n of [...notions].sort((a, b) => (a.etude < b.etude ? 1 : -1))) {
    const bloc = el('div', 'aa-notion');
    const tete = el('div', 'aa-notion-tete');
    const nom = el('p', 'aa-notion-nom', n.nom);
    nom.appendChild(el('span', 'aa-petit', ` ${tr('plan.etudie', { date: dateLisible(n.etude, langue) })}`));
    const suppr = el('button', 'aa-lien-btn aa-danger', tr('plan.supprimer'));
    suppr.type = 'button';
    suppr.setAttribute('aria-label', `${tr('plan.supprimer')} : ${n.nom}`);
    suppr.addEventListener('click', () => {
      if (!window.confirm(tr('plan.confirmer', { nom: n.nom }))) return;
      notions = notions.filter((x) => x.id !== n.id);
      sauverPlan();
      rendrePlan();
    });
    tete.append(nom, suppr);
    const revs = el('div', 'aa-revs');
    for (const r of n.revisions) revs.appendChild(caseRevision(n, r, aujourdhui));
    bloc.append(tete, revs);
    planListe.appendChild(bloc);
  }
}

planDate.value = dateDuJour();
planForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const res = nouvelleNotion(planNom.value, planDate.value, nouvelId());
  if (!res.ok) {
    erreurPlan = res.raison === 'nom' ? 'plan.erreur.nom' : 'plan.erreur.date';
    rendrePlan();
    (res.raison === 'nom' ? planNom : planDate).focus();
    return;
  }
  erreurPlan = null;
  notions = [...notions, res.notion];
  sauverPlan();
  planNom.value = '';
  rendrePlan();
  planNom.focus();
});
planNom.addEventListener('input', () => {
  if (!erreurPlan) return;
  erreurPlan = null;
  planErreur.hidden = true;
});

// Page laissée ouverte pendant la nuit : « à réviser aujourd'hui » suit la date.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') rendrePlan();
});

// ---------------------------------------------------------------------------
// Checklist du jour J à imprimer : tous ses menus ouverts, le reste masqué
// ---------------------------------------------------------------------------

const imprimer = document.getElementById('aa-imprimer');
const menusConcours = [...document.querySelectorAll('#concours details')];
let etatMenus = null;
if (imprimer && typeof window.print === 'function') {
  imprimer.hidden = false;
  imprimer.addEventListener('click', () => {
    document.body.dataset.imprimer = 'concours';
    window.print();
  });
  // Ctrl+P aussi : on imprime les explications, pas seulement les titres.
  window.addEventListener('beforeprint', () => {
    etatMenus = menusConcours.map((d) => d.open);
    menusConcours.forEach((d) => { d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (etatMenus) menusConcours.forEach((d, i) => { d.open = etatMenus[i]; });
    etatMenus = null;
    delete document.body.dataset.imprimer;
  });
}

appliquerLangue();
