import { expect, test } from '@playwright/test';

/**
 * Journey A (task 13.8, `quality-assurance` spec): open the chart, toggle Tree ⇄ Network,
 * and confirm "Download PDF" returns a valid A3-landscape PDF. Runs against the real app
 * stack (`docker compose up`), not a mock — see `E2E_BASE_URL` / `playwright.config.ts`.
 */

/** Chromium's `page.pdf({ format: 'A3', landscape: true })` (see `chart-pdf.service.ts`)
 * emits a MediaBox in points; A3 landscape is ~1190.55 x 841.89pt. Parsed straight out of
 * the raw PDF bytes since the page dictionary is written uncompressed by Chromium. */
function readMediaBoxPt(pdfBytes: Buffer): { width: number; height: number } {
  const match = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(
    pdfBytes.toString('latin1'),
  );
  if (!match) throw new Error('no /MediaBox found in PDF output');
  const [, x1, y1, x2, y2] = match.map(Number);
  return { width: x2 - x1, height: y2 - y1 };
}

test('view the chart, toggle Tree/Network, and download a valid A3 PDF', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Organization chart' }).click();
  await expect(page).toHaveURL(/\/chart$/);

  // Tree view is the default: department cards render, roots come from the seeded masters.
  const tree = page.locator('.tree');
  await expect(tree).toBeVisible();
  await expect(tree.locator('.node').first()).toBeVisible();
  await expect(tree.locator('.dn').first()).not.toBeEmpty();

  // Toggle to Network: the tree unmounts, the node/edge SVG view takes over.
  await page.getByRole('button', { name: 'Network', exact: true }).click();
  await expect(page.locator('.network')).toBeVisible();
  await expect(page.locator('.tree')).toHaveCount(0);

  // Toggle back to Tree.
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(page.locator('.tree')).toBeVisible();
  await expect(page.locator('.network')).toHaveCount(0);

  // Download PDF: a real browser download of the Puppeteer-rendered A3 PDF.
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
  expect(width).toBeGreaterThan(height); // landscape
  // A3 landscape is 1190.55 × 841.89pt; allow ±2pt for the installed Chromium's A3 rounding.
  expect(Math.abs(width - 1190.55)).toBeLessThan(2);
  expect(Math.abs(height - 841.89)).toBeLessThan(2);
});
