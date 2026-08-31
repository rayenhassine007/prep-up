import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const oursPath = path.resolve(__dirname, '../src/data/rangs_2024_capacites_2025.json');
const tte2024Path = process.argv[2] || '/tmp/ranks_2024_tte.json';
const tte2025Path = process.argv[3] || '/tmp/ranks_2025_tte.json';

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

const ours = JSON.parse(fs.readFileSync(oursPath, 'utf8'));
const tte2024 = loadTte(tte2024Path);
const tte2025 = loadTte(tte2025Path);

const diffs = [];
const missingInOurs = [];
const missingInTte = new Set([...tte2024.keys(), ...tte2025.keys()]);

for (const p of ours.programmes) {
  const k = key(p.institution, p.filiere);
  missingInTte.delete(k);
  const f24 = tte2024.get(k);
  const f25 = tte2025.get(k);

  if (!f24) missingInOurs.push({ side: '2024', inst: p.institution, filiere: p.filiere });
  if (!f25) missingInOurs.push({ side: '2025', inst: p.institution, filiere: p.filiere });

  for (const t of TRACKS) {
    const o24 = p[t];
    const t24 = f24?.[t];
    if (f24 && o24?.capacite > 0) {
      const oMin = o24.rang_min;
      const oMax = o24.rang_max;
      const tMin = t24?.min ?? null;
      const tMax = t24?.max ?? null;
      if (oMin !== tMin || oMax !== tMax) {
        diffs.push({
          year: 2024,
          inst: p.institution,
          filiere: p.filiere,
          track: t,
          ours: [oMin, oMax],
          tte: [tMin, tMax],
        });
      }
    }

    const o25 = p.r2025?.[t];
    const t25 = f25?.[t];
    if (f25 && (o25 || (t25?.max != null && t25?.capacity > 0))) {
      const oMin = Array.isArray(o25) ? o25[0] : null;
      const oMax = Array.isArray(o25) ? o25[1] : null;
      const tMin = t25?.min ?? null;
      const tMax = t25?.max ?? null;
      const oHas = oMin != null || oMax != null;
      const tHas = tMin != null || tMax != null;
      if (oHas !== tHas || oMin !== tMin || oMax !== tMax) {
        diffs.push({
          year: 2025,
          inst: p.institution,
          filiere: p.filiere,
          track: t,
          ours: [oMin, oMax],
          tte: [tMin, tMax],
        });
      }
    }
  }
}

console.log('=== Rank mismatches (ours vs TTE) ===');
console.log(JSON.stringify(diffs, null, 2));
console.log(`\nTotal mismatches: ${diffs.length}`);
console.log('\n=== In ours but missing in TTE ===');
console.log(JSON.stringify(missingInOurs, null, 2));
console.log('\n=== In TTE but missing in ours (sample) ===');
console.log([...missingInTte].slice(0, 20));
