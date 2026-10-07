// Page « Apprendre à apprendre » : le texte est dans le HTML (lisible sans JS et
// par les moteurs de recherche) ; ce module n'ajoute que l'interactif. Tout ce
// que la personne note reste dans son navigateur (localStorage), et la page
// marche quand même si le stockage est bloqué : elle oublie juste au
// rechargement.

import {
  CHECKLIST,
  QUESTIONS,
  aReviser,
  basculerRevision,
  checklistDuJour,
  dateDuJour,
  dateLisible,
  exporterIcs,
  modifierNotion,
  notionsValides,
  nouvelleNotion,
  reponsesValides,
  resultatQuiz,
} from './lib/apprendre-logic.js';

const CLE_QUIZ = 'pu-aa-quiz';
const CLE_REGLES = 'pu-aa-regles';
const CLE_PLAN = 'pu-aa-plan';
const CLE_SOIR = 'pu-aa-soir';

function lireJson(cle) {
  try {
    return JSON.parse(localStorage.getItem(cle));
  } catch {
    return null;
  }
}

function ecrireJson(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

function stockageDisponible() {
  try {
    localStorage.setItem('pu-aa-test', '1');
    localStorage.removeItem('pu-aa-test');
    return true;
  } catch {
    return false;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function titreRegle(id) {
  return document.querySelector(`#${id} h3`)?.textContent || '';
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

const quizEl = document.getElementById('aa-quiz');
const resteEl = document.getElementById('aa-quiz-reste');
const resultatEl = document.getElementById('aa-quiz-resultat');

function lireReponses() {
  const rep = {};
  for (const q of QUESTIONS) {
    const coche = quizEl.querySelector(`input[name="${q.id}"]:checked`);
    if (coche) rep[q.id] = coche.value;
  }
  return rep;
}

function marquerCibles(cibles) {
  document.querySelectorAll('.aa-cible').forEach((n) => n.classList.remove('aa-cible'));
  document.querySelectorAll('.aa-cible-badge').forEach((n) => n.remove());
  for (const id of cibles) {
    const bloc = document.getElementById(id);
    if (!bloc) continue;
    bloc.classList.add('aa-cible');
    const badge = el('span', 'aa-cible-badge', 'Priorité pour toi');
    const titre = bloc.querySelector('h2, h3');
    titre?.after(badge);
  }
}

function afficherQuiz(reponses, { annoncer = false } = {}) {
  const res = resultatQuiz(reponses);
  if (!res) {
    const manque = QUESTIONS.length - Object.keys(reponses).length;
    resteEl.textContent = manque < QUESTIONS.length
      ? `Encore ${manque} question${manque > 1 ? 's' : ''} pour voir ton profil.`
      : '';
    resultatEl.hidden = true;
    marquerCibles([]);
    return;
  }
  resteEl.textContent = '';
  resultatEl.replaceChildren();
  resultatEl.dataset.profil = res.profil.cle;

  resultatEl.appendChild(el('p', 'aa-res-etiquette', 'Ton profil'));
  const titre = el('p', 'aa-res-nom', res.profil.nom);
  resultatEl.appendChild(titre);
  resultatEl.appendChild(el('p', 'aa-res-score', `${res.score} / ${res.max} en mauvaises habitudes`));
  resultatEl.appendChild(el('p', 'aa-res-texte', res.profil.texte));

  if (res.cibles.length) {
    resultatEl.appendChild(el('p', 'aa-res-sous-titre', 'D’après tes « Oui », commence par :'));
    const liste = el('ul', 'aa-res-liens');
    for (const id of res.cibles) {
      const li = el('li');
      const a = el('a', 'inline-link', id === 'procrastination'
        ? 'Vaincre la procrastination'
        : `Règle ${id.split('-')[1]} : ${titreRegle(id)}`);
      a.href = `#${id}`;
      li.appendChild(a);
      liste.appendChild(li);
    }
    resultatEl.appendChild(liste);
  }

  const refaire = el('button', 'btn-ghost aa-refaire', 'Refaire le test');
  refaire.type = 'button';
  refaire.addEventListener('click', () => {
    quizEl.reset();
    ecrireJson(CLE_QUIZ, {});
    afficherQuiz({});
    quizEl.querySelector('input')?.focus();
  });
  resultatEl.appendChild(refaire);

  resultatEl.hidden = false;
  marquerCibles(res.cibles);
  if (annoncer) {
    resultatEl.focus({ preventScroll: true });
    resultatEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

if (quizEl) {
  const memo = reponsesValides(lireJson(CLE_QUIZ));
  for (const [id, valeur] of Object.entries(memo)) {
    const input = quizEl.querySelector(`input[name="${id}"][value="${valeur}"]`);
    if (input) input.checked = true;
  }
  afficherQuiz(memo);

  quizEl.addEventListener('change', () => {
    const avant = resultatEl.hidden;
    const rep = lireReponses();
    ecrireJson(CLE_QUIZ, rep);
    afficherQuiz(rep, { annoncer: avant });
  });
  quizEl.addEventListener('submit', (e) => e.preventDefault());
}

// ---------------------------------------------------------------------------
// Les 10 règles : « Je l'applique »
// ---------------------------------------------------------------------------

const compteRegles = document.getElementById('aa-regles-compte');
let appliquees = new Set(Array.isArray(lireJson(CLE_REGLES)) ? lireJson(CLE_REGLES) : []);

function majCompte() {
  const n = appliquees.size;
  compteRegles.textContent = n
    ? `Tu appliques ${n} règle${n > 1 ? 's' : ''} sur 10.`
    : '';
}

function peindreBouton(btn, actif) {
  btn.setAttribute('aria-pressed', String(actif));
  btn.querySelector('.aa-applique-texte').textContent = actif ? 'Je l’applique' : 'Je l’applique ?';
  btn.closest('.aa-regle').classList.toggle('aa-appliquee', actif);
}

document.querySelectorAll('.aa-regle').forEach((carte) => {
  const id = carte.id;
  const btn = el('button', 'aa-applique');
  btn.type = 'button';
  btn.append(el('span', 'aa-applique-case'), el('span', 'aa-applique-texte'));
  btn.setAttribute('aria-label', `Je l’applique : règle ${id.split('-')[1]}`);
  carte.appendChild(btn); // avant de peindre : peindreBouton remonte à la carte
  peindreBouton(btn, appliquees.has(id));
  btn.addEventListener('click', () => {
    if (appliquees.has(id)) appliquees.delete(id);
    else appliquees.add(id);
    ecrireJson(CLE_REGLES, [...appliquees]);
    peindreBouton(btn, appliquees.has(id));
    majCompte();
  });
});
majCompte();

// ---------------------------------------------------------------------------
// Planificateur de répétition espacée
// ---------------------------------------------------------------------------

const planForm = document.getElementById('aa-plan-form');
const planNom = document.getElementById('aa-plan-nom');
const planDate = document.getElementById('aa-plan-date');
const planEnvoyer = document.getElementById('aa-plan-envoyer');
const planAnnuler = document.getElementById('aa-plan-annuler');
const planErreur = document.getElementById('aa-plan-erreur');
const planAujourdhui = document.getElementById('aa-plan-aujourdhui');
const planListe = document.getElementById('aa-plan-liste');
const planIcs = document.getElementById('aa-plan-ics');

let notions = notionsValides(lireJson(CLE_PLAN));
let enEdition = null;

function sauverPlan() {
  ecrireJson(CLE_PLAN, notions);
}

function nouvelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function caseRevision(notion, r, aujourdhui) {
  const label = el('label', 'aa-rev');
  if (r.faite) label.classList.add('faite');
  else if (r.date < aujourdhui) label.classList.add('retard');
  else if (r.date === aujourdhui) label.classList.add('jour');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = r.faite;
  input.addEventListener('change', () => {
    notions = basculerRevision(notions, notion.id, r.j);
    sauverPlan();
    rendrePlan();
  });
  label.append(input, el('span', 'aa-rev-j', `J+${r.j}`), el('span', 'aa-rev-date', dateLisible(r.date)));
  return label;
}

function rendrePlan() {
  const aujourdhui = dateDuJour();

  // « À réviser aujourd'hui »
  planAujourdhui.replaceChildren();
  if (notions.length) {
    const dues = aReviser(notions, aujourdhui);
    const titre = el('h4', 'aa-plan-titre', 'À réviser aujourd’hui');
    planAujourdhui.appendChild(titre);
    if (!dues.length) {
      planAujourdhui.appendChild(el('p', 'aa-petit', 'Rien à réviser aujourd’hui. Profite pour avancer.'));
    } else {
      const ul = el('ul', 'aa-dues');
      for (const d of dues) {
        const li = el('li');
        const label = el('label');
        const input = el('input');
        input.type = 'checkbox';
        input.addEventListener('change', () => {
          notions = basculerRevision(notions, d.id, d.j);
          sauverPlan();
          rendrePlan();
        });
        const texte = el('span', null, `${d.nom} `);
        texte.appendChild(el('span', 'aa-rev-j', `J+${d.j}`));
        if (d.enRetard) texte.appendChild(el('span', 'aa-retard', ` en retard (prévu le ${dateLisible(d.date)})`));
        label.append(input, texte);
        li.appendChild(label);
        ul.appendChild(li);
      }
      planAujourdhui.appendChild(ul);
    }
  }

  // Toutes les notions
  planListe.replaceChildren();
  if (notions.length) planListe.appendChild(el('h4', 'aa-plan-titre', 'Tous mes chapitres'));
  for (const n of [...notions].sort((a, b) => (a.etude < b.etude ? 1 : -1))) {
    const bloc = el('div', 'aa-notion');
    const tete = el('div', 'aa-notion-tete');
    const nom = el('p', 'aa-notion-nom', n.nom);
    nom.appendChild(el('span', 'aa-petit', ` étudié le ${dateLisible(n.etude)}`));
    const actions = el('div', 'aa-notion-actions');
    const modif = el('button', 'aa-lien-btn', 'Modifier');
    modif.type = 'button';
    modif.setAttribute('aria-label', `Modifier ${n.nom}`);
    modif.addEventListener('click', () => commencerEdition(n));
    const suppr = el('button', 'aa-lien-btn aa-danger', 'Supprimer');
    suppr.type = 'button';
    suppr.setAttribute('aria-label', `Supprimer ${n.nom}`);
    suppr.addEventListener('click', () => {
      if (!window.confirm(`Supprimer « ${n.nom} » et ses révisions ?`)) return;
      notions = notions.filter((x) => x.id !== n.id);
      if (enEdition === n.id) arreterEdition();
      sauverPlan();
      rendrePlan();
    });
    actions.append(modif, suppr);
    tete.append(nom, actions);
    const revs = el('div', 'aa-revs');
    for (const r of n.revisions) revs.appendChild(caseRevision(n, r, aujourdhui));
    bloc.append(tete, revs);
    planListe.appendChild(bloc);
  }

  planIcs.hidden = !notions.some((n) => n.revisions.some((r) => !r.faite));
}

function commencerEdition(n) {
  enEdition = n.id;
  planNom.value = n.nom;
  planDate.value = n.etude;
  planEnvoyer.textContent = 'Enregistrer';
  planAnnuler.hidden = false;
  planErreur.hidden = true;
  planNom.focus();
  planForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function arreterEdition() {
  enEdition = null;
  planNom.value = '';
  planDate.value = dateDuJour();
  planEnvoyer.textContent = 'Ajouter';
  planAnnuler.hidden = true;
}

if (planForm) {
  planDate.value = dateDuJour();
  if (!stockageDisponible()) {
    const note = el('p', 'aa-petit aa-avertissement', 'Ton navigateur bloque l’enregistrement (navigation privée ?) : ce que tu notes ici disparaîtra au rechargement de la page.');
    planForm.before(note);
  }

  planForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = enEdition
      ? modifierNotion(notions.find((n) => n.id === enEdition), planNom.value, planDate.value)
      : nouvelleNotion(planNom.value, planDate.value, nouvelId());
    if (!res.ok) {
      planErreur.textContent = res.raison === 'nom' ? 'Indique le chapitre ou la notion.' : 'Choisis une date valide.';
      planErreur.hidden = false;
      (res.raison === 'nom' ? planNom : planDate).focus();
      return;
    }
    planErreur.hidden = true;
    notions = enEdition
      ? notions.map((n) => (n.id === enEdition ? res.notion : n))
      : [...notions, res.notion];
    sauverPlan();
    arreterEdition();
    rendrePlan();
    planNom.focus();
  });
  planAnnuler.addEventListener('click', arreterEdition);
  planNom.addEventListener('input', () => { planErreur.hidden = true; });

  planIcs.addEventListener('click', () => {
    const horodatage = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const blob = new Blob([exporterIcs(notions, horodatage)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'revisions-prep-up.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  rendrePlan();
}

// ---------------------------------------------------------------------------
// Checklist du soir : repart à zéro chaque jour
// ---------------------------------------------------------------------------

const checklistEl = document.getElementById('aa-checklist');
const coucherEl = document.getElementById('aa-coucher');
const bravoEl = document.getElementById('aa-checklist-bravo');
let soir = checklistDuJour(lireJson(CLE_SOIR), dateDuJour());

function rendreSoir() {
  checklistEl.querySelectorAll('input[type="checkbox"]').forEach((c) => {
    c.checked = soir.cochees.includes(c.value);
  });
  coucherEl.value = soir.coucher;
  const complet = soir.cochees.length === CHECKLIST.length && soir.coucher;
  bravoEl.textContent = complet ? `Tout est prêt pour demain. Bonne nuit, extinction à ${soir.coucher}.` : '';
}

if (checklistEl) {
  checklistEl.addEventListener('change', () => {
    const aujourdhui = dateDuJour();
    if (soir.date !== aujourdhui) soir = checklistDuJour(null, aujourdhui);
    soir.cochees = [...checklistEl.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
    soir.coucher = coucherEl.value || '';
    ecrireJson(CLE_SOIR, soir);
    rendreSoir();
  });
  rendreSoir();
}

// Page laissée ouverte pendant la nuit : la checklist et les révisions du jour
// doivent suivre la date en revenant dessus.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const aujourdhui = dateDuJour();
  if (soir.date !== aujourdhui) {
    soir = checklistDuJour(null, aujourdhui);
    rendreSoir();
  }
  if (planForm) rendrePlan();
});

// ---------------------------------------------------------------------------
// Checklist du jour J à imprimer
// ---------------------------------------------------------------------------

const imprimer = document.getElementById('aa-imprimer');
if (imprimer && typeof window.print === 'function') {
  imprimer.hidden = false;
  imprimer.addEventListener('click', () => {
    document.body.dataset.imprimer = 'concours';
    window.print();
  });
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.imprimer;
  });
}
