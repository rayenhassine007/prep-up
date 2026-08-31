#!/usr/bin/env node
/**
 * Sync rang_min / rang_max (2024) and r2025 from The Tunisian Engineers JSON.
 * Keeps Prep'Up capacities (2026 JORT). Source files:
 *   https://thetunisianengineers.com/data/ranks_2024.json
 *   https://thetunisianengineers.com/data/ranks_2025.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.resolve(ROOT, 'src/data/rangs_2024_capacites_2025.json');
const TTE_2024 = process.argv[2] || '/tmp/ranks_2024_tte.json';
const TTE_2025 = process.argv[3] || '/tmp/ranks_2025_tte.json';
const TRACKS = ['MP', 'PC', 'PT', 'BG'];

function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function key(inst, filiere) {
  return `${norm(inst)}|${norm(filiere)}`;
}

function loadTte(file) {
  const schools = JSON.parse(fs.readFileSync(file, 'utf8'));
  const map = new Map();
  for (const school of schools) {
    for (const field of school.fields || []) {
      map.set(key(school.school, field.name), field);
    }
  }
  return map;
}

/** Map TTE min/max to Prep'Up rang_min / rang_max (pair for simulation when only min). */
function toRanks(min, max) {
  let rmin = typeof min === 'number' ? min : null;
  let rmax = typeof max === 'number' ? max : null;
  if (rmin != null && rmax != null && rmin > rmax) [rmin, rmax] = [rmax, rmin];
  if (rmin != null && rmax == null) rmax = rmin;
  if (rmin == null && rmax != null) rmin = null;
  return { rang_min: rmin, rang_max: rmax };
}

/** r2025 tuple: keep null min when only last rank is known. */
function toR2025(min, max) {
  let rmin = typeof min === 'number' ? min : null;
  let rmax = typeof max === 'number' ? max : null;
  if (rmin != null && rmax != null && rmin > rmax) [rmin, rmax] = [rmax, rmin];
  if (rmin != null && rmax == null) rmax = rmin;
  if (rmax == null) return null;
  return [rmin, rmax];
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const tte2024 = loadTte(TTE_2024);
const tte2025 = loadTte(TTE_2025);

let updated = 0;
let missing = [];

for (const p of data.programmes) {
  const k = key(p.institution, p.filiere);
  const f24 = tte2024.get(k);
  const f25 = tte2025.get(k);

  if (!f24) missing.push({ year: 2024, inst: p.institution, filiere: p.filiere });
  if (!f25) missing.push({ year: 2025, inst: p.institution, filiere: p.filiere });

  for (const t of TRACKS) {
    if (f24) {
      const td = f24[t];
      if (td && p[t]) {
        const next = toRanks(td.min, td.max);
        if (p[t].rang_min !== next.rang_min || p[t].rang_max !== next.rang_max) {
          p[t].rang_min = next.rang_min;
          p[t].rang_max = next.rang_max;
          updated++;
        }
      }
    }

    if (f25) {
      const td = f25[t];
      if (!p.r2025) p.r2025 = { MP: null, PC: null, PT: null, BG: null };
      const next = td && td.capacity > 0 ? toR2025(td.min, td.max) : null;
      const cur = p.r2025[t];
      const same = (cur == null && next == null)
        || (Array.isArray(cur) && Array.isArray(next) && cur[0] === next[0] && cur[1] === next[1]);
      if (!same) {
        p.r2025[t] = next;
        updated++;
      }
    }
  }
}

data.source =
  "Rangs 2024 et 2025 synchronises avec The Tunisian Engineers (thetunisianengineers.com/data/ranks_2024.json et ranks_2025.json). Capacites session 2026 (JORT n°35 du 3 avril 2026, total officiel 3238 places).";
data.note =
  "PT = filiere Technologie (T). rang_min = meilleur rang admis, rang_max = dernier rang admis (annee de reference). r2025 = [rang_min, rang_max] session 2025. Estimation indicative, pas garantie d'affectation.";

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');

console.log(`Updated ${updated} rank field(s).`);
if (missing.length) {
  console.log('Missing in TTE (left unchanged):', missing);
}
