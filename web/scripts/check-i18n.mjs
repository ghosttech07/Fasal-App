// Translation check (runs as `npm test` in web): every language has every English key, and each translation
// keeps exactly the same {placeholders}, so no screen ever shows a blank amount, date or name.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/i18n/', import.meta.url));
const entries = (file) => {
  const text = readFileSync(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^\s+'([\w.]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'/gm)) out.set(m[1], m[2]);
  return out;
};
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const en = entries(join(dir, 'en.ts'));
const batches = ['', ...readdirSync(dir).filter((d) => /^b\d+$/.test(d))];
const langs = readdirSync(dir)
  .filter((f) => /^[a-z]{2}\.ts$/.test(f) && f !== 'en.ts')
  .map((f) => f.slice(0, 2));
let problems = 0;
for (const lang of langs) {
  const all = new Map();
  for (const b of batches) {
    try {
      for (const [k, v] of entries(join(dir, b, `${lang}.ts`))) all.set(k, v);
    } catch {
      /* this batch has no file for the language */
    }
  }
  for (const [k, v] of en) {
    if (!all.has(k)) {
      problems++;
      console.log(`${lang}: missing ${k}`);
    } else if (holes(all.get(k)) !== holes(v)) {
      problems++;
      console.log(`${lang}: ${k} has {${holes(all.get(k))}} but English has {${holes(v)}}`);
    }
  }
  for (const k of all.keys())
    if (!en.has(k)) {
      problems++;
      console.log(`${lang}: ${k} is not an English key`);
    }
}
console.log(`${langs.length} languages × ${en.size} strings checked, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
