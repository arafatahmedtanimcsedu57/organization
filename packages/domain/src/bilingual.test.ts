import assert from 'node:assert/strict';
import { test } from 'vitest';

import { CANONICAL_TITLES, findTitleByLabel } from './config.ts';
import { computeDisplayNames } from './disambiguateNames.ts';
import { titleLabel } from './placeMembers.ts';
import type { Employee } from './model.ts';

function emp(sysId: string, lastName: string, firstName: string): Employee {
  return { sysId, userId: sysId, lastName, firstName, title: '', titleId: '', departmentName: 'd' };
}

// Sys IDs carrying language-aware DISPLAY_OVERRIDES (see config.ts).
const ONISHI = '4df2151147314610d1f9cc39116d438f';
const YAMAMOTO_KOTA = '1532b321c31e821043a51c777a01314c';
const YAMAMOTO_KOHTA = '0a527321c31e821043a51c777a0131d8';

test('a title resolves from either language to the same record', () => {
  assert.equal(
    findTitleByLabel(CANONICAL_TITLES, '課長')?.id,
    findTitleByLabel(CANONICAL_TITLES, 'Manager')?.id,
  );
});

test('rank-distinct English labels resolve to distinct titles', () => {
  // The reference sheet reuses labels; our English titles must not collapse them.
  assert.notEqual(
    findTitleByLabel(CANONICAL_TITLES, 'Division Manager')?.id, // 本部長
    findTitleByLabel(CANONICAL_TITLES, 'Business Unit Manager')?.id, // 事業部長
  );
  assert.notEqual(
    findTitleByLabel(CANONICAL_TITLES, 'Chief')?.id, // 主任
    findTitleByLabel(CANONICAL_TITLES, 'Senior Chief')?.id, // 主任2
  );
});

test('titleLabel returns the Japanese or English label per lang', () => {
  const manager = findTitleByLabel(CANONICAL_TITLES, '課長')!;
  assert.equal(titleLabel(manager, 'ja'), '課長');
  assert.equal(titleLabel(manager, 'en'), 'Manager');
});

test('computeDisplayNames picks the language-specific override', () => {
  const ja = computeDisplayNames([emp(ONISHI, '大西', '隆洋')], 'ja');
  assert.equal(ja.get(ONISHI), '大西【大阪】');
  const en = computeDisplayNames([emp(ONISHI, 'Onishi', 'Takahiro')], 'en');
  assert.equal(en.get(ONISHI), 'Onishi【Osaka】');
});

test('English-only overrides disambiguate romaji names that share a first initial', () => {
  // Kota / Kohta both start "K" — the automatic initial rule can't separate them.
  const en = computeDisplayNames(
    [emp(YAMAMOTO_KOTA, 'Yamamoto', 'Kota'), emp(YAMAMOTO_KOHTA, 'Yamamoto', 'Kohta')],
    'en',
  );
  assert.equal(en.get(YAMAMOTO_KOTA), 'Yamamoto (Kota)');
  assert.equal(en.get(YAMAMOTO_KOHTA), 'Yamamoto (Kohta)');
});

test('an English-only override does not leak into the Japanese chart', () => {
  const ja = computeDisplayNames([emp(YAMAMOTO_KOTA, '山本', '皓太')], 'ja');
  assert.equal(ja.get(YAMAMOTO_KOTA), '山本'); // automatic rule (unique here), not the en label
});
