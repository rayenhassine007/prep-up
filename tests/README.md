# Prep'Up test suite

## Commands

| Command | Description |
|---|---|
| `npm test` | Run unit + BDD tests |
| `npm run test:unit` | Vitest unit tests (54 tests) |
| `npm run test:bdd` | Playwright BDD scenarios (18 tests, desktop + mobile) |
| `npm run test:unit:watch` | Vitest watch mode for TDD |

## Structure

- **`src/lib/`** — Pure business logic extracted for testability (rank, simulateur, objectif, annee1, chapitres, ressources).
- **`tests/unit/`** — Unit tests (Vitest) covering score/rank math, tiers, sorting, semester averages, favorites, chapter dedup.
- **`tests/bdd/`** — BDD-style Playwright scenarios (Given/When/Then) for homepage, calculateur, ressources, chapitres.

## Coverage areas

| Module | What is tested |
|---|---|
| `rank.js` | Score, bonus, rank estimation, bisection inverse |
| `calculator-reach.js` | Reach tiers (probable/incertain/impossible) |
| `simulateur-logic.js` | Écart tiers (sûr/probable/hors de portée), proximity sort |
| `objectif-logic.js` | Target rank → needed notes, school picker |
| `annee1-logic.js` | Component weighting, target verdict, annual formula |
| `chapitres-logic.js` | Name cleanup, dedup, session years |
| `ressources-logic.js` | Search, favorites, recents cap |
| BDD | End-to-end user flows in the browser |
