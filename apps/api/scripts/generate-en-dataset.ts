/**
 * Regenerates the English dataset (`data/en/*.xlsx`) from the Japanese masters
 * (`data/ja/*.xlsx`) plus the hand-edited translation map (`data/translations.en.json`).
 *
 * Every id / Sys ID and every column the app does not read is copied through verbatim;
 * only the display columns the org chart uses are translated:
 *   - cmn_department: Name, Parent (re-pointed to the translated parent Name), Department head
 *   - sys_user:       Last name, First name, Title, Department (the name-based join key)
 * so the name-based joins (`sys_user.Department` -> `cmn_department.Name`, and
 * `cmn_department.Parent` -> `cmn_department.Name`) still resolve in English.
 *
 * Run with `npm run data:gen:en` (from apps/api). The output is committed, so the
 * container never regenerates it; re-run only after editing the translation map.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const jaDir = path.join(repoRoot, 'data', 'ja');
const enDir = path.join(repoRoot, 'data', 'en');

interface Translations {
  titles: Record<string, string>;
  departments: Record<string, { name: string; head: string }>;
  people: Record<string, { lastName: string; firstName: string }>;
}

const translations: Translations = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data', 'translations.en.json'), 'utf-8'),
) as Translations;

/** Match the domain's `normalizeTitle`: fold full-width digits so 主任２ === 主任2. */
const normalizeTitle = (t: string): string =>
  t.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));

type Row = Record<string, string>;

function readRows(file: string, sheet = 'Page 1'): { wb: XLSX.WorkBook; rows: Row[] } {
  const wb = XLSX.read(fs.readFileSync(path.join(jaDir, file)), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheet]!, { defval: '', raw: false });
  return { wb, rows };
}

function write(wb: XLSX.WorkBook, rows: Row[], file: string, sheet = 'Page 1'): void {
  wb.Sheets[sheet] = XLSX.utils.json_to_sheet(rows);
  fs.mkdirSync(enDir, { recursive: true });
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  fs.writeFileSync(path.join(enDir, file), buf);
}

// --- departments: build id->EN-name and JA-name->EN-name maps, then translate ---
const dept = readRows('cmn_department.xlsx');
const enNameById = new Map<string, string>();
const enNameByJaName = new Map<string, string>();
for (const r of dept.rows) {
  const id = String(r['ID'] ?? '').trim();
  if (!r['Name']) continue;
  const t = translations.departments[id];
  if (!t) throw new Error(`No EN translation for department id "${id}" (${r['Name']})`);
  enNameById.set(id, t.name);
  enNameByJaName.set(String(r['Name']).trim(), t.name);
}

for (const r of dept.rows) {
  const id = String(r['ID'] ?? '').trim();
  if (!r['Name']) continue;
  const t = translations.departments[id]!;
  r['Name'] = t.name;
  r['Department head'] = t.head;
  const parentJa = String(r['Parent'] ?? '').trim();
  if (parentJa) {
    const parentEn = enNameByJaName.get(parentJa);
    if (!parentEn) throw new Error(`Department "${t.name}" parent "${parentJa}" has no EN name`);
    r['Parent'] = parentEn;
  }
}
write(dept.wb, dept.rows, 'cmn_department.xlsx');

// --- employees: translate name, title, and the department join key ---
const user = readRows('sys_user.xlsx');
for (const r of user.rows) {
  const ln = String(r['Last name'] ?? '');
  const fn = String(r['First name'] ?? '');
  if (!ln && !fn) continue; // skip blank rows
  const sysId = String(r['Sys ID'] ?? '').trim();
  const p = translations.people[sysId];
  if (!p) throw new Error(`No EN translation for employee Sys ID "${sysId}" (${ln} ${fn})`);
  r['Last name'] = p.lastName;
  r['First name'] = p.firstName;

  const titleJa = normalizeTitle(String(r['Title'] ?? '').trim());
  if (titleJa) {
    const titleEn = translations.titles[titleJa];
    if (!titleEn) throw new Error(`No EN translation for title "${titleJa}"`);
    r['Title'] = titleEn;
  }

  const deptJa = String(r['Department'] ?? '').trim();
  if (deptJa) {
    const deptEn = enNameByJaName.get(deptJa);
    if (!deptEn) throw new Error(`Employee ${ln} ${fn} department "${deptJa}" has no EN name`);
    r['Department'] = deptEn;
  }
}
write(user.wb, user.rows, 'sys_user.xlsx');

// --- smoke check: every join key resolves in the English dataset ---
const enNames = new Set(enNameById.values());
for (const r of dept.rows) {
  const parent = String(r['Parent'] ?? '').trim();
  if (parent && !enNames.has(parent))
    throw new Error(`EN parent "${parent}" is not a department name`);
}
for (const r of user.rows) {
  const d = String(r['Department'] ?? '').trim();
  if (d && !enNames.has(d))
    throw new Error(`EN employee department "${d}" is not a department name`);
}

console.log(
  `[gen:en] wrote data/en/cmn_department.xlsx (${enNameById.size} departments) ` +
    `and data/en/sys_user.xlsx; all joins resolve.`,
);
