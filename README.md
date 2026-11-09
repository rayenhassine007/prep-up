# Prep'Up

Outils gratuits pour les prépas (**MP / PC / T (PT) / BG**), en ligne sur [prep-upp.com](https://prep-upp.com).

## Pages

| Page | Fichier | Ce qu'elle fait |
|---|---|---|
| Accueil | `index.html` | Présentation des outils, onglets « À propos » / « Contact », questions fréquentes |
| Calculateur de rang | `calculateur.html` | Notes → moyenne → **rang estimé** (distributions réelles 2020–2025), **filières accessibles** (Sûr / Probable / Hors de portée), notes à viser |
| Ressources | `ressources.html` | Cours, TD, DS et sujets classés par filière, année et matière ; formulaire « Proposer une ressource » |
| Places 2026 | `places-2026.html` | Les **3 238 places** du JORT par école et spécialité |
| Chapitres du concours | `chapitres-concours.html` | Historique des chapitres tombés aux sessions 2017–2026 (MP, PC, T, BG) |
| Apprendre à apprendre | `apprendre-a-apprendre.html` | 7 méthodes de révision, test rapide, planificateur ; en français et en arabe (`?lang=ar`) |

Sur toutes les pages : le bouton « Une idée ? » et le micro-sondage « Cette page t'a servi ? » envoient les retours par mail via FormSubmit.

## Stack

- **Vite** (multi-pages) · HTML / CSS / JS **vanilla**, aucun framework.
- Données statiques en **JSON**, thème clair / sombre.
- Hébergement **Vercel** : chaque commit sur `main` est déployé automatiquement.

## Développement local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # génère dist/ puis pré-rend le contenu (scripts/prerender.mjs)
npm run preview    # sert le build de production
npm test           # tests unitaires (Vitest) + scénarios navigateur (Playwright)
```

## Organisation du dépôt

```
*.html                  Les 6 pages (Vite les prend à la racine)
vite.config.js          Entrées multi-pages et adresses sans .html en local
vercel.json             Adresses sans .html en production (/calculateur, ...)

src/                    Le code du site
  *.js                  Un script par page (calculator, ressources, places, chapitres,
                        apprendre, a-propos) + les scripts communs (ui, feedback,
                        icons, analytics, search, navigateur)
  lib/                  Logique pure, sans DOM, couverte par les tests unitaires
  data/                 Données JSON : rangs, places, coefficients, distributions,
                        chapitres, liste des ressources (ressources.json)
  styles/main.css       Tout le style

public/                 Servi tel quel à la racine du site
  sources/              PDF hébergés sur le site (rapports du jury, cours, séries)
  logo.*, icons.svg     Logo et icônes
  og-*.png              Images de partage (réseaux sociaux)
  sitemap.xml, robots.txt, llms.txt   Pour Google, Bing et les assistants IA
  4d4c3a....txt         Clé IndexNow (ne pas supprimer)

scripts/
  prerender.mjs         Au build, écrit le contenu des pages Ressources, Places et
                        Chapitres dans le HTML, pour qu'il soit lisible par Google
  indexnow*.mjs         Annonce à Bing les pages modifiées après chaque déploiement

tests/
  unit/                 Tests Vitest de src/lib
  bdd/                  Scénarios Playwright (accueil, calculateur, ressources, ...)

.github/workflows/
  indexnow.yml          Lance scripts/indexnow.mjs après chaque déploiement Vercel
```

## Ajouter une ressource

- **Lien Drive / MEGA :** ajouter une entrée dans `src/data/ressources.json`, dans la bonne filière, année et matière.
- **PDF hébergé sur le site :** le placer dans `public/sources/` et le référencer comme `/sources/nom-du-fichier.pdf`.

## Données & sources

Rangs et capacités basés sur les **résultats officiels d'affectation** et le **Journal Officiel (JORT)**. Les estimations sont indicatives : vérifie toujours les informations officielles.

Les **liens de ressources** sont proposés par la communauté et vérifiés avant publication. Pour signaler un lien problématique ou demander un retrait : onglet Contact de l'accueil ou contact.prep.upp@gmail.com.
