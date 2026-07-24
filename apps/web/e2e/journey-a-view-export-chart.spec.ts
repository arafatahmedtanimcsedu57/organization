import { expect, test } from '@playwright/test';

/**
 * Journey A (`quality-assurance` spec, updated by `redesign-org-chart-canvas`): open the
 * chart, exercise the Top-down canvas (zoom, search, fullscreen control), toggle
 * Top-down ⇄ Horizontal, and confirm "Download PDF" returns a valid **A4-portrait** PDF.
 * Runs against the real app stack (`docker compose up`), not a mock.
 */

/** Chromium's `page.pdf({ format: 'A4' })` emits a MediaBox in points; A4 portrait is
 * ~595.28 × 841.89pt. Parsed straight out of the raw PDF bytes since the page dictionary
 * is written uncompressed by Chromium. */
function readMediaBoxPt(pdfBytes: Buffer): { width: number; height: number } {
  const match = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(
    pdfBytes.toString('latin1'),
  );
  if (!match) throw new Error('no /MediaBox found in PDF output');
  const [, x1, y1, x2, y2] = match.map(Number);
  return { width: x2 - x1, height: y2 - y1 };
}

test('view the chart canvas, search and zoom, toggle views, and download a valid A4 PDF', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Organization chart' }).click();
  await expect(page).toHaveURL(/\/chart$/);

  // Top-down canvas is the default: cards render with the floating toolbar.
  const canvas = page.locator('.topdown-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.topdown-node').first()).toBeVisible();
  await expect(canvas.locator('.dn').first()).not.toBeEmpty();

  // Zoom controls: the % readout responds.
  const readout = page.locator('.canvas-toolbar').getByText('%');
  const before = await readout.innerText();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(readout).not.toHaveText(before);
  await page.getByRole('button', { name: 'Fit to screen' }).click();

  // Fullscreen control is present (entering real fullscreen is environment-dependent).
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();

  // Search-to-locate: matching a department highlights a node; nonsense yields 0 hits.
  const search = page.getByRole('searchbox', { name: 'Search the chart' });
  const firstDept = (await canvas.locator('.dn').first().innerText()).trim();
  await search.fill(firstDept.slice(0, 3));
  await expect(page.locator('.topdown-node.ring-2').first()).toBeVisible();
  await search.fill('zzz-no-such-thing');
  await expect(page.locator('.canvas-toolbar')).toContainText('0 hits');
  await search.fill('');

  // Toggle to Horizontal: the indented tree replaces the canvas.
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click();
  await expect(page.locator('.tree')).toBeVisible();
  await expect(page.locator('.topdown-canvas')).toHaveCount(0);

  // Toggle back to Top-down.
  await page.getByRole('button', { name: 'Top-down', exact: true }).click();
  await expect(page.locator('.topdown-canvas')).toBeVisible();
  await expect(page.locator('.tree')).toHaveCount(0);

  // Download PDF: a real browser download of the Puppeteer-rendered A4-portrait PDF.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);

  const pdfPath = await download.path();
  if (!pdfPath) throw new Error('download did not save to disk');
  const fs = await import('node:fs');
  const pdfBytes = fs.readFileSync(pdfPath);

  expect(pdfBytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(pdfBytes.length).toBeGreaterThan(10_000);

  const { width, height } = readMediaBoxPt(pdfBytes);
  expect(height).toBeGreaterThan(width); // portrait
  // A4 portrait is 595.28 × 841.89pt; allow ±2pt for the installed Chromium's rounding.
  expect(Math.abs(width - 595.28)).toBeLessThan(2);
  expect(Math.abs(height - 841.89)).toBeLessThan(2);
});
