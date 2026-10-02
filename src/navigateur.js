// Bandeau affiché seulement dans le navigateur intégré d'une appli (Facebook,
// Messenger, Instagram, TikTok). Les documents Drive s'y ouvrent mal ; le
// bandeau explique pourquoi et donne la sortie la plus courte pour le système :
// un bouton qui rouvre la page dans Chrome sur Android, la marche à suivre sur
// iPhone, et un lien à copier partout.
//
// La croix le masque pour la session : il ne revient pas à chaque page vue,
// mais réapparaît si la personne revient plus tard depuis Facebook.

import { appliIntegree, lienChrome, systeme } from './lib/navigateur-integre.js';

const CLE_MASQUE = 'pu-bandeau-navigateur';

function estMasque() {
  try {
    return sessionStorage.getItem(CLE_MASQUE) === '1';
  } catch {
    return false;
  }
}

function masquer() {
  try {
    sessionStorage.setItem(CLE_MASQUE, '1');
  } catch {
    /* le bandeau reviendra au prochain chargement, rien de grave */
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

async function copier(url, bouton) {
  try {
    await navigator.clipboard.writeText(url);
    bouton.textContent = 'Lien copié';
  } catch {
    // Certains navigateurs intégrés refusent le presse-papiers : la boîte de
    // dialogue laisse au moins sélectionner le lien à la main.
    window.prompt('Copie ce lien puis colle-le dans ton navigateur :', url);
  }
}

export function afficherBandeauNavigateur(avant, ua = navigator.userAgent) {
  const appli = appliIntegree(ua);
  if (!appli || !avant || estMasque()) return;

  const os = systeme(ua);
  const url = location.origin + location.pathname;

  const bandeau = el('div', 'nav-integre');
  bandeau.setAttribute('role', 'note');

  const texte = el('div', 'nav-integre-texte');
  texte.appendChild(el('strong', null, `Tu es dans le navigateur de ${appli}.`));
  texte.append(' Les documents Drive s\'y ouvrent mal (page blanche, connexion demandée). ');
  texte.append(
    os === 'ios'
      ? 'Touche le menu ••• puis « Ouvrir dans le navigateur » pour passer sur Safari.'
      : 'Ouvre Prep\'Up dans ton navigateur habituel, tout y marche.',
  );
  bandeau.appendChild(texte);

  const actions = el('div', 'nav-integre-actions');
  if (os === 'android') {
    const chrome = el('a', 'nav-integre-btn principal', 'Ouvrir dans Chrome');
    chrome.href = lienChrome(url);
    actions.appendChild(chrome);
  }
  const copie = el('button', 'nav-integre-btn', 'Copier le lien');
  copie.type = 'button';
  copie.addEventListener('click', () => copier(url, copie));
  actions.appendChild(copie);
  bandeau.appendChild(actions);

  const fermer = el('button', 'nav-integre-fermer', '×');
  fermer.type = 'button';
  fermer.setAttribute('aria-label', 'Masquer ce message');
  fermer.addEventListener('click', () => {
    masquer();
    bandeau.remove();
  });
  bandeau.appendChild(fermer);

  avant.before(bandeau);
}
