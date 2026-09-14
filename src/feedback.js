// Bouton de retour, présent sur toutes les pages, et micro-sondage de bas de
// page. Les deux envoient vers la même adresse que les propositions de
// ressources, via FormSubmit.
//
// Tout est construit en JS plutôt qu'écrit dans les cinq pages : c'est un
// contrôle client, inutile à un robot d'indexation, et une seule définition
// évite que les pages divergent. Le prerender ne l'émet pas, pour la même
// raison que les étoiles de favori des ressources.
//
// Le bouton flottant se referme définitivement si on clique sa croix, mais le
// lien du pied de page reste : on peut masquer la pastille, pas la
// fonctionnalité.

import { iconEl } from './icons.js';
import { endpointAjax } from './lib/contact.js';
import {
  MAX_MESSAGE,
  TYPES,
  clePage,
  contexte,
  peutEnvoyer,
  validerRetour,
} from './lib/feedback-logic.js';

const CLE_MASQUE = 'pu-feedback-masque';
const CLE_DERNIER = 'pu-feedback-dernier';

// localStorage jette en navigation privée et quand les cookies sont bloqués :
// le bouton doit marcher quand même, il perd juste sa mémoire.
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
  } catch {
    /* rien à faire : la préférence ne sera pas retenue */
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// La filière et l'épreuve affichées sur la page des chapitres. Ailleurs, rien.
function selectionCourante() {
  return {
    filiere: document.querySelector('#chap-filieres button.active')?.textContent?.trim() || '',
    epreuve: document.querySelector('#chap-tabs button.active .chap-tab-name')?.textContent?.trim() || '',
  };
}

function contexteCourant() {
  const { filiere, epreuve } = selectionCourante();
  return contexte({
    url: location.pathname + location.search,
    filiere,
    epreuve,
    largeur: window.innerWidth,
  });
}

async function envoyer(champs) {
  const body = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) body.append(cle, valeur);
  body.append('_captcha', 'false');
  body.append('_template', 'table');
  const res = await fetch(endpointAjax(), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
  if (!res.ok) throw new Error('envoi refusé');
  ecrire(CLE_DERNIER, String(Date.now()));
}

// ---------------------------------------------------------------------------
// Le modal
// ---------------------------------------------------------------------------

let modal = null;
let champType = TYPES[0][0];

function construireModal() {
  const dlg = el('dialog', 'submit-modal fb-modal');
  dlg.id = 'fb-modal';

  const titre = el('h3');
  titre.appendChild(iconEl('i-bulb', 'icon'));
  titre.append(' Ton avis sur Prep’Up');
  dlg.appendChild(titre);

  dlg.appendChild(el('p', 'fb-intro',
    'Une idée, un truc à changer ou à enlever, un chiffre qui te paraît faux, un bug : dis-le. C’est anonyme et ça prend dix secondes.'));

  const form = el('form', 'submit-form fb-form');
  form.noValidate = true;

  // Champ piège : un robot le remplit, un humain ne le voit pas.
  const honey = el('input', 'submit-honey');
  honey.type = 'text';
  honey.name = '_honey';
  honey.tabIndex = -1;
  honey.autocomplete = 'off';
  honey.setAttribute('aria-hidden', 'true');
  form.appendChild(honey);

  const groupe = el('div', 'fb-types');
  groupe.setAttribute('role', 'radiogroup');
  groupe.setAttribute('aria-label', 'Type de retour');
  for (const [cle, libelle] of TYPES) {
    const btn = el('button', 'fb-type' + (cle === champType ? ' active' : ''), libelle);
    btn.type = 'button';
    btn.dataset.type = cle;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(cle === champType));
    btn.addEventListener('click', () => {
      champType = cle;
      for (const autre of groupe.querySelectorAll('.fb-type')) {
        const actif = autre.dataset.type === cle;
        autre.classList.toggle('active', actif);
        autre.setAttribute('aria-checked', String(actif));
      }
      erreur.hidden = true;
    });
    groupe.appendChild(btn);
  }
  form.appendChild(groupe);

  const champMessage = el('label', 'submit-field');
  champMessage.appendChild(el('span', null, 'Ton message'));
  const zone = el('textarea');
  zone.id = 'fb-message';
  zone.rows = 5;
  zone.maxLength = MAX_MESSAGE;
  zone.placeholder = 'Ce que tu voudrais voir, ce qui te gêne, ce qui manque...';
  champMessage.appendChild(zone);
  form.appendChild(champMessage);

  const champContact = el('label', 'submit-field');
  champContact.appendChild(el('span', null, 'Ton contact (facultatif, pour une réponse)'));
  const contact = el('input');
  contact.id = 'fb-contact';
  contact.type = 'text';
  contact.maxLength = 120;
  contact.placeholder = 'mail ou Instagram';
  champContact.appendChild(contact);
  form.appendChild(champContact);

  const erreur = el('p', 'submit-error');
  erreur.id = 'fb-error';
  erreur.hidden = true;
  erreur.setAttribute('role', 'alert');
  form.appendChild(erreur);

  const actions = el('div', 'modal-actions');
  const annuler = el('button', 'btn-ghost', 'Annuler');
  annuler.type = 'button';
  annuler.addEventListener('click', () => dlg.close());
  const envoi = el('button', 'submit-btn', 'Envoyer');
  envoi.type = 'submit';
  actions.append(annuler, envoi);
  form.appendChild(actions);

  zone.addEventListener('input', () => { erreur.hidden = true; });

  const MESSAGES = {
    type: 'Choisis de quoi tu veux parler.',
    court: 'Écris quelques mots de plus pour que ce soit exploitable.',
    long: 'Message trop long : va à l’essentiel.',
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (honey.value) return; // robot

    const verdict = validerRetour({ type: champType, message: zone.value });
    if (!verdict.ok) {
      erreur.textContent = MESSAGES[verdict.raison];
      erreur.hidden = false;
      zone.focus();
      return;
    }
    if (!peutEnvoyer(Date.now(), Number(lire(CLE_DERNIER)))) {
      erreur.textContent = 'Tu viens d’envoyer un message. Réessaie dans deux minutes.';
      erreur.hidden = false;
      return;
    }

    envoi.disabled = true;
    envoi.textContent = 'Envoi...';
    erreur.hidden = true;
    try {
      await envoyer({
        _subject: 'Prep’Up : retour visiteur',
        type: TYPES.find(([c]) => c === champType)[1],
        message: verdict.message,
        contact: contact.value.trim() || '(non renseigné)',
        contexte: contexteCourant(),
      });
      form.replaceChildren(el('p', 'submit-thanks',
        'Merci. Ton message est arrivé, il sera lu.'));
      // Le formulaire vient d'être remplacé par le remerciement : il faudra le
      // reconstruire à la prochaine ouverture, sinon le modal revient vide et
      // on ne peut plus rien envoyer.
      dlg.dataset.envoye = '1';
      setTimeout(() => dlg.close(), 1800);
    } catch {
      erreur.textContent = 'L’envoi a échoué. Réessaie, ou écris à ' + 'contact.prep.upp@gmail.com' + '.';
      erreur.hidden = false;
      envoi.disabled = false;
      envoi.textContent = 'Envoyer';
    }
  });

  dlg.appendChild(form);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  document.body.appendChild(dlg);
  return dlg;
}

export function ouvrirRetour() {
  // On garde le modal d'une ouverture à l'autre, pour ne pas perdre un message
  // à moitié écrit si on le ferme par erreur. Après un envoi, en revanche, il
  // n'y a plus de formulaire dedans : on repart d'un neuf.
  if (modal?.dataset.envoye) {
    modal.remove();
    modal = null;
    champType = TYPES[0][0];
  }
  if (!modal) modal = construireModal();
  modal.showModal();
  modal.querySelector('#fb-message')?.focus();
}

// ---------------------------------------------------------------------------
// La pastille flottante
// ---------------------------------------------------------------------------

function construireBouton() {
  if (lire(CLE_MASQUE) === '1') return;

  const wrap = el('div', 'fb-fab');
  const ouvrir = el('button', 'fb-fab-main');
  ouvrir.type = 'button';
  ouvrir.appendChild(iconEl('i-bulb', 'icon'));
  ouvrir.append(el('span', 'fb-fab-label', 'Une idée ?'));
  ouvrir.addEventListener('click', ouvrirRetour);

  const fermer = el('button', 'fb-fab-close', '×');
  fermer.type = 'button';
  fermer.setAttribute('aria-label', 'Masquer ce bouton');
  fermer.title = 'Masquer ce bouton (il restera dans le pied de page)';
  fermer.addEventListener('click', () => {
    ecrire(CLE_MASQUE, '1');
    wrap.remove();
  });

  wrap.append(ouvrir, fermer);
  document.body.appendChild(wrap);
}

// Le filet de sécurité : masquer la pastille ne doit pas supprimer le moyen de
// donner son avis.
function lienPiedDePage() {
  const nav = document.querySelector('.site-footer-nav');
  if (!nav || nav.querySelector('.fb-footer-link')) return;
  const lien = el('a', 'fb-footer-link', 'Une idée ?');
  lien.href = '#';
  lien.addEventListener('click', (e) => {
    e.preventDefault();
    ouvrirRetour();
  });
  nav.appendChild(lien);
}

// ---------------------------------------------------------------------------
// Le micro-sondage
// ---------------------------------------------------------------------------

function construireSondage() {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const cle = clePage(location.pathname);
  if (lire(cle)) return; // déjà répondu sur cette page

  const bloc = el('section', 'fb-poll');
  bloc.setAttribute('aria-label', 'Cette page t’a servi ?');
  const question = el('p', 'fb-poll-q', 'Cette page t’a servi ?');
  const boutons = el('div', 'fb-poll-actions');

  const remercier = (texte) => {
    ecrire(cle, '1');
    bloc.replaceChildren(el('p', 'fb-poll-q', texte));
  };

  const voter = async (vote) => {
    // Le vote part tout de suite : un pouce ne doit jamais attendre.
    try {
      await envoyer({
        _subject: 'Prep’Up : micro-sondage',
        vote,
        contexte: contexteCourant(),
      });
    } catch {
      /* un vote perdu ne vaut pas un message d'erreur */
    }
  };

  const oui = el('button', 'fb-poll-btn');
  oui.type = 'button';
  oui.appendChild(iconEl('i-thumb-up', 'icon'));
  oui.append(el('span', null, 'Oui'));
  oui.addEventListener('click', () => {
    voter('oui');
    remercier('Merci, content que ça serve.');
  });

  const non = el('button', 'fb-poll-btn');
  non.type = 'button';
  non.appendChild(iconEl('i-thumb-down', 'icon'));
  non.append(el('span', null, 'Non'));
  non.addEventListener('click', () => {
    voter('non');
    // Un pouce bas sans explication n'apprend rien : on demande, sans obliger.
    bloc.replaceChildren();
    bloc.appendChild(el('p', 'fb-poll-q', 'Qu’est-ce qui manque ?'));
    const ligne = el('form', 'fb-poll-more');
    const zone = el('input');
    zone.type = 'text';
    zone.maxLength = MAX_MESSAGE;
    zone.placeholder = 'En une phrase (facultatif)';
    zone.setAttribute('aria-label', 'Ce qui manque sur cette page');
    const envoi = el('button', 'fb-poll-send', 'Envoyer');
    envoi.type = 'submit';
    ligne.append(zone, envoi);
    ligne.addEventListener('submit', async (e) => {
      e.preventDefault();
      const texte = zone.value.trim();
      if (texte) {
        try {
          await envoyer({
            _subject: 'Prep’Up : micro-sondage',
            vote: 'non',
            message: texte,
            contexte: contexteCourant(),
          });
        } catch {
          /* idem : on ne bloque pas le visiteur là-dessus */
        }
      }
      remercier('Merci, c’est noté.');
    });
    bloc.appendChild(ligne);
    zone.focus();
  });

  boutons.append(oui, non);
  bloc.append(question, boutons);
  footer.parentNode.insertBefore(bloc, footer);
}

construireBouton();
lienPiedDePage();
construireSondage();
