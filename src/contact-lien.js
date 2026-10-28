// Lien « Mail » du bloc Contact de l'accueil. L'adresse n'est écrite en clair
// qu'ici, une fois la page chargée : dans le HTML elle reste en « [at] », pour
// ne pas la servir toute prête aux robots qui ramassent les adresses.
//
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
