// Page Contact : l'adresse n'est écrite en clair qu'ici, une fois la page
// chargée. Dans le HTML elle reste en « [at] », pour ne pas la servir toute
// prête aux robots qui ramassent les adresses.

import { CONTACT_EMAIL } from './lib/contact.js';

const lien = document.getElementById('ct-mail');
const texte = document.getElementById('ct-mail-adresse');
if (lien && texte) {
  lien.href = `mailto:${CONTACT_EMAIL}`;
  texte.textContent = CONTACT_EMAIL;
}
