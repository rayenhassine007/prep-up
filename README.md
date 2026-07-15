# Prep'Up

Outils gratuits pour les prépas tunisiennes (**MP / PC / PT / BG**) — sans inscription, mobile-friendly.

## Fonctionnalités

- **Calculateur de rang** — entre tes notes par matière, obtiens ta moyenne et ton **rang estimé** à partir des distributions réelles (2020–2025).
- **Simulateur de rang** — avec ton rang, découvre les **filières accessibles** : classées Sûr / Probable / Hors de portée, d'après les rangs d'affectation **2024 & 2025**, avec les places **2026**. Filtres (probabilité, université, spécialité), tri, et constructeur de liste de vœux.
- **Ressources** — cours, TD, DS et concours classés par filière et matière.
- **Places 2026** — le tableau JORT des **3 238 places** par école et par spécialité.

## Stack

- **Vite** (multi-pages) · HTML / CSS / JS **vanilla**, aucun framework.
- Données statiques en **JSON**. Thème sombre.

## Développement local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # génère dist/
npm run preview   # sert le build de production
```

## Structure

```
index.html              Accueil
calculateur.html        Calculateur & simulateur de rang
ressources.html         Ressources
places-2026.html        Places 2026
vite.config.js          Config Vite (entrées multi-pages)
public/
  logo.svg
  sources/              Rapports du jury (PDF) cités par le calculateur
src/
  calculator.js         Notes → score → rang estimé
  simulateur.js         Rang → filières accessibles (filtres, vœux)
  places.js             Tableau des places 2026
  ressources.js         Filtres des ressources
  ui.js                 Thème, animations d'apparition
  styles/main.css       Styles
  data/                 Rangs, capacités, coefficients, distributions, ressources…
```

## Données & sources

Rangs et capacités basés sur les **résultats officiels d'affectation** et le **Journal Officiel (JORT)**. Les estimations sont indicatives — vérifie toujours les informations officielles.

Les **liens de ressources** sont proposés par la communauté et modérés manuellement. Pour signaler un lien problématique ou demander un retrait, contacte le mainteneur.

## Déploiement

Déployé sur **Vercel** (build Vite automatique à chaque push). Aucune configuration serveur.
