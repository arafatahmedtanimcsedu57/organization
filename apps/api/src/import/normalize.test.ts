import assert from 'node:assert/strict';
import { test } from 'vitest';

import { normalizeFullWidthDigits, normalizeText, repairMojibake } from './normalize.ts';

test('full-width digits in a title are converted to ASCII', () => {
  assert.equal(normalizeFullWidthDigits('主任２'), '主任2');
  assert.equal(normalizeFullWidthDigits('主任2'), '主任2');
});

test('known mojibake is repaired to the correct UTF-8 characters', () => {
  assert.equal(repairMojibake('å¥³'), '女');
  assert.equal(repairMojibake('ç”·'), '男');
});

test('ordinary Japanese text is left untouched by mojibake repair', () => {
  assert.equal(repairMojibake('佐藤'), '佐藤');
  assert.equal(repairMojibake('SW開発課 1G'), 'SW開発課 1G');
});

test('plain ASCII is left untouched by mojibake repair', () => {
  assert.equal(repairMojibake('0002'), '0002');
});

test('normalizeText trims and collapses full-width spaces to ASCII spaces', () => {
  assert.equal(normalizeText('営業本部　業務課'), '営業本部 業務課');
  assert.equal(normalizeText('  課員  '), '課員');
});

test('normalizeText composes digit normalization and mojibake repair', () => {
  assert.equal(normalizeText('主任２'), '主任2');
  assert.equal(normalizeText('å¥³'), '女');
});
