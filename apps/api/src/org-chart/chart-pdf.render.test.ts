/// <reference lib="dom" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { fileURLToPath } from 'node:url';

import { buildDepartmentTree, placeAssignments, placeEmployees, type Member, type OrgNode } from '@org-chart/domain';
import { ReadMastersService } from '../import/read-masters.service.ts';
import { SEED_ASSIGNMENTS } from '../import/seed-assignments.data.ts';

/**
 * `org-chart` capability, task 6.3: verifies the Puppeteer/Chromium PDF pipeline (task 6.1's
 * `fonts-noto-cjk` + task 6.2's renderer) actually produces a correct A4-portrait PDF from the *real*
 * masters - full Japanese names, every roster expanded (no truncation), 兼務 marked distinctly -
 * rather than trusting the wiring alone. It renders a minimal print-mode fixture built from the
 * real domain output (the same `@org-chart/domain` pipeline `OrgChartService` uses) instead of
 * going through `ChartPdfService`/HTTP, because the SPA's `/chart?print=1` route (task 9.8) does
 * not exist yet; once it does, this can point at `ChartPdfService` directly.
 *
 * Requires a real Chromium binary (`PUPPETEER_EXECUTABLE_PATH`, set by `apps/api/Dockerfile`);
 * skips outside that environment rather than failing a plain `npm install`.
 */

const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'TryOutProgram');

function buildRealOrgModel() {
  const readMasters = new ReadMastersService();
  const departments = readMasters.readDepartments(path.join(sourceDir, 'cmn_department.xlsx'));
  const employees = readMasters.readEmployees(path.join(sourceDir, 'sys_user.xlsx'));

  const tree = buildDepartmentTree(departments);
  const memberWarnings = placeEmployees(tree, employees);
  const assignmentWarnings = placeAssignments(tree, employees, SEED_ASSIGNMENTS);

  return {
    roots: tree.roots,
    warnings: [...tree.warnings, ...memberWarnings, ...assignmentWarnings],
    employeeCount: employees.length,
    concurrentCount: SEED_ASSIGNMENTS.length,
  };
}

/** Print-mode fixture: every roster expanded in full, 兼務 entries visually distinct. */
function renderPrintHtml(roots: OrgNode[]): string {
  const memberRow = (m: Member): string => {
    const cls = m.concurrent ? 'member concurrent' : 'member';
    const label = m.concurrent ? `(兼)${m.displayName}` : m.displayName;
    return `<div class="${cls}">${m.title}${label}</div>`;
  };
  const renderNode = (node: OrgNode): string => {
    const managers = node.managers.map(memberRow).join('');
    const staff = node.staff
      .map((m) => `<span class="staff-name${m.concurrent ? ' concurrent' : ''}">${m.concurrent ? '(兼)' : ''}${m.displayName}</span>`)
      .join('');
    return `<section>${node.name}${managers}${staff}${node.children.map(renderNode).join('')}</section>`;
  };
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 8mm; }
    body { font-family: "Noto Sans CJK JP", "Noto Sans JP", sans-serif; }
    .member.concurrent, .staff-name.concurrent { color: #c00; }
  </style></head><body>${roots.map(renderNode).join('')}</body></html>`;
}

function resolveChromiumPath(): string | undefined {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(
    (p): p is string => !!p,
  );
  return candidates.find((p) => fs.existsSync(p));
}

test('the real chart data renders to a valid A4 PDF with full rosters and distinct 兼務 marking', async (t) => {
  const executablePath = resolveChromiumPath();
  if (!executablePath) {
    t.skip('no Chromium binary found (set PUPPETEER_EXECUTABLE_PATH); this pipeline is verified inside the api Docker image');
    return;
  }

  const { roots, warnings, employeeCount, concurrentCount } = buildRealOrgModel();
  assert.deepEqual(warnings, []);

  const html = renderPrintHtml(roots);

  // Nothing is truncated: every placed person (primary + concurrent) appears once in the markup.
  const renderedCount = (html.match(/class="member/g) ?? []).length + (html.match(/class="staff-name/g) ?? []).length;
  assert.equal(renderedCount, employeeCount + concurrentCount);

  // 兼務 postings are marked with the distinct `concurrent` class, one per seeded assignment.
  const concurrentMarkupCount =
    (html.match(/class="member concurrent"/g) ?? []).length + (html.match(/class="staff-name concurrent"/g) ?? []).length;
  assert.equal(concurrentMarkupCount, concurrentCount);
  assert.equal((html.match(/\(兼\)/g) ?? []).length, concurrentCount);

  const htmlPath = path.join(os.tmpdir(), `chart-print-${Date.now()}.html`);
  fs.writeFileSync(htmlPath, html);

  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({ format: 'A4', landscape: false, printBackground: true });
    assert.equal(Buffer.from(pdf.subarray(0, 5)).toString(), '%PDF-');
    assert.ok(pdf.length > 10_000, 'expected a substantial multi-department PDF, not a near-empty page');

    // Proxy for "no tofu": the CJK font family actually used to paint the page resolved and loaded.
    const fontCheck = await page.evaluate(() => document.fonts.check('16px "Noto Sans CJK JP"'));
    assert.equal(fontCheck, true, 'Noto Sans CJK JP did not resolve - Japanese text would render as tofu');
  } finally {
    await browser.close();
    fs.rmSync(htmlPath, { force: true });
  }
});
