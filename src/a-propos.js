// Accueil, section « À propos » : deux onglets, « À propos » et « Contact »,
// qui se remplacent avec un fondu. Sans JS, les deux panneaux restent
// affichés l'un sous l'autre : la classe js-onglets n'est posée qu'ici.
//
// Le pied de page de chaque page pointe vers /#contact : ce lien ouvre
// directement l'onglet Contact.
//
// L'adresse n'est écrite en clair qu'ici, une fois la page chargée : dans le
// HTML elle reste en « [at] », pour ne pas la servir toute prête aux robots.
// Le lien ouvre Gmail sur un nouveau message déjà adressé, plutôt qu'un
// mailto: qui, sur ordinateur, lance l'appli mail par défaut (souvent aucune).

import { CONTACT_EMAIL } from './lib/contact.js';

const lien = document.getElementById('ct-mail');
const texte = document.getElementById('ct-mail-adresse');
if (lien && texte) {
  lien.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;
  lien.target = '_blank';
  lien.rel = 'noopener';
  texte.textContent = CONTACT_EMAIL;
}

const panneaux = document.querySelector('.about-panneaux');
const onglets = [...document.querySelectorAll('.about-tabs [role="tab"]')];

function choisir(onglet, { focus = false } = {}) {
  for (const o of onglets) {
    const actif = o === onglet;
    o.setAttribute('aria-selected', String(actif));
    o.tabIndex = actif ? 0 : -1;
    const panneau = document.getElementById(o.getAttribute('aria-controls'));
    panneau?.classList.toggle('actif', actif);
    panneau?.setAttribute('aria-hidden', String(!actif));
  }
  if (focus) onglet.focus();
}

function ouvrirDepuisAdresse() {
  if (location.hash !== '#contact') return;
  choisir(document.getElementById('tab-contact'));
  // Aucun élément ne porte l'id « contact » : le navigateur ne saute nulle
  // part et c'est nous qui amenons la section, une fois la page chargée (les
  // blocs du dessus changent encore de hauteur avant).
  const amener = () => document.getElementById('a-propos')?.scrollIntoView({ block: 'start' });
  if (document.readyState === 'complete') amener();
  else window.addEventListener('load', amener, { once: true });
}

if (panneaux && onglets.length === 2) {
  panneaux.parentElement.classList.add('js-onglets');
  for (const o of onglets) {
    o.addEventListener('click', () => choisir(o));
    // Flèches gauche / droite entre les onglets, comme un vrai tablist.
    o.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      choisir(onglets[(onglets.indexOf(o) + 1) % onglets.length], { focus: true });
    });
  }
  choisir(onglets[0]);
  ouvrirDepuisAdresse();
  window.addEventListener('hashchange', ouvrirDepuisAdresse);
  // Déjà sur l'accueil : le lien du pied de page ne recharge rien, et si
  // l'adresse finit déjà par #contact, hashchange ne part même pas.
  for (const a of document.querySelectorAll('a[href="/#contact"]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', '/#contact');
      choisir(document.getElementById('tab-contact'));
      document.getElementById('a-propos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
