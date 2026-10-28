// Page Contact : l'adresse n'est écrite en clair qu'ici, une fois la page
// chargée. Dans le HTML elle reste en « [at] », pour ne pas la servir toute
// prête aux robots qui ramassent les adresses.
//
// Un lien mailto: seul ne suffit pas : sur ordinateur, il ouvre l'appli mail
// par défaut (souvent aucune n'est réglée) et pas Gmail dans le navigateur.
// D'où trois boutons : Gmail web, l'appli mail, et copier l'adresse.

import { CONTACT_EMAIL } from './lib/contact.js';

const texte = document.getElementById('ct-mail-adresse');
const actions = document.getElementById('ct-mail-actions');
const gmail = document.getElementById('ct-gmail');
const mailto = document.getElementById('ct-mailto');
const copier = document.getElementById('ct-copier');

if (texte && actions && gmail && mailto && copier) {
  texte.textContent = CONTACT_EMAIL;
  gmail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;
  mailto.href = `mailto:${CONTACT_EMAIL}`;
  actions.hidden = false;

  copier.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      copier.textContent = 'Adresse copiée';
    } catch {
      // Presse-papiers refusé (navigateur intégré, http) : on sélectionne le
      // texte pour qu'un appui long suffise.
      const plage = document.createRange();
      plage.selectNodeContents(texte);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(plage);
      copier.textContent = 'Sélectionnée, copie-la';
    }
    setTimeout(() => { copier.textContent = "Copier l'adresse"; }, 2500);
  });
}
