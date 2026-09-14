// Adresse qui reçoit ce que les visiteurs envoient : propositions de ressources
// et retours sur le site. Elle vit ici plutôt que dans ressources.json parce que
// le bouton de retour est chargé sur toutes les pages : importer le JSON des
// ressources (55 ko) pour une seule ligne l'aurait embarqué partout.
export const CONTACT_EMAIL = 'contact.prep.upp@gmail.com';

// FormSubmit : l'endpoint AJAX répond en JSON, le POST classique redirige.
// Seul le second garde les pièces jointes.
export function endpointAjax(email = CONTACT_EMAIL) {
  return `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
}

export function endpointPost(email = CONTACT_EMAIL) {
  return `https://formsubmit.co/${encodeURIComponent(email)}`;
}
