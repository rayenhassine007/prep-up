/**
 * Navigateurs intégrés aux applis (Facebook, Messenger, Instagram, TikTok).
 *
 * Une bonne partie des visiteurs arrive depuis un lien partagé sur Facebook et
 * reste dans le navigateur de l'appli. Drive s'y ouvre mal : page blanche,
 * connexion demandée, PDF qui ne se télécharge pas. On ne peut pas réparer ce
 * navigateur, seulement le reconnaître et proposer d'en sortir.
 */

// Messenger avant Facebook : son agent contient aussi « FBAN ».
const APPLIS = [
  ['Messenger', /FBAN\/Messenger|MessengerForiOS|FB_IAB\/Orca/i],
  ['Facebook', /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i],
  ['Instagram', /Instagram/i],
  ['TikTok', /musical_ly|BytedanceWebview|TikTok/i],
];

/** Nom de l'appli dont le navigateur intégré affiche la page, ou null. */
export function appliIntegree(ua) {
  const agent = String(ua || '');
  for (const [nom, motif] of APPLIS) {
    if (motif.test(agent)) return nom;
  }
  return null;
}

/** 'android', 'ios' ou 'autre' : la façon d'en sortir n'est pas la même. */
export function systeme(ua) {
  const agent = String(ua || '');
  if (/Android/i.test(agent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
  return 'autre';
}

/**
 * Lien qui rouvre `url` dans Chrome sur Android. Les navigateurs intégrés
 * laissent passer les liens intent:// vers une autre appli. Si Chrome n'est pas
 * installé, le lien de secours recharge simplement la page sur place.
 */
export function lienChrome(url) {
  const u = new URL(url);
  const scheme = u.protocol.replace(':', '');
  const reste = `${u.host}${u.pathname}${u.search}`;
  return (
    `intent://${reste}#Intent;scheme=${scheme};package=com.android.chrome;`
    + `S.browser_fallback_url=${encodeURIComponent(u.href)};end`
  );
}
