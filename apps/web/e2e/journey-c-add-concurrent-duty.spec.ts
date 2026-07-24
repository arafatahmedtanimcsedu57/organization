import { expect, test } from '@playwright/test';
import { removeAssignmentsFor } from './assignment-helpers';

/**
 * Journey C (task 13.10, `quality-assurance` spec): add a concurrent (兼務) posting for a
 * person into a second department, and confirm the sourced 兼 chip appears in that
 * department's roster on the chart. Runs against the real app stack (`docker compose up`),
 * not a mock — see `E2E_BASE_URL` / `playwright.config.ts`.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('add a concurrent posting and see the sourced 兼 chip on the chart', async ({ page }) => {
  // --- Employees → pick the first row for its identity + home department/title ---
  await page.goto('/admin/employees');
  await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();

  const row = page.locator('.itable tbody tr').first();
  const userId = (await row.locator('td').nth(0).innerText()).trim();
  const fullName = (await row.locator('.person b').innerText()).trim();
  const lastName = fullName.split(/\s+/)[0];
  const homeDepartment = (await row.locator('.dept').innerText()).trim();
  const homeTitle = (await row.locator('td').nth(2).innerText()).trim();

  // --- Concurrent duties → add a posting for that person into a different department ---
  await page.goto('/admin/assignments');
  await expect(page.getByRole('heading', { name: 'Concurrent duties (兼務)' })).toBeVisible();

  // Determine the target department first, then pre-clean any postings left in the shared
  // seeded database by earlier runs, so "exactly one row" below stays a valid assertion.
  await page.getByRole('button', { name: 'Add posting' }).click();
  const departmentOptions = await page
    .locator('#asn-department option:not([disabled])')
    .allTextContents();
  const targetDepartment = departmentOptions
    .map((text) => text.trim())
    .find((text) => text !== homeDepartment);
  if (!targetDepartment)
    throw new Error('no other department available to post the concurrent duty into');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await removeAssignmentsFor(page, userId, targetDepartment);

  await page.getByRole('button', { name: 'Add posting' }).click();
  await page.locator('#asn-person').selectOption({ label: `${fullName} (${userId})` });
  await page.locator('#asn-department').selectOption({ label: targetDepartment });

  const postingTitle = '部長';
  await page.locator('#asn-title').fill(postingTitle);

  await page
    .getByRole('region', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Save' })
    .click();

  await expect(page.getByRole('heading', { name: 'Add posting' })).toHaveCount(0);
  // Identify the newly-added posting by person AND target department: the person may already have
  // a (seeded) 兼務 in another department, so filtering by name alone can match the wrong row.
  const newRow = page
    .locator('.itable tbody tr')
    .filter({ has: page.locator('.person', { hasText: fullName }) })
    .filter({ has: page.locator('.dept', { hasText: targetDepartment }) });
  await expect(newRow).toHaveCount(1);
  await expect(newRow).toContainText('兼務');

  // --- Org chart shows the sourced 兼 chip in the target department (Horizontal view) ---
  await page.goto('/chart');
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click();
  const deptName = page
    .locator('.dn')
    .filter({ hasText: new RegExp(`^${escapeRegExp(targetDepartment)}$`) });
  const deptCard = deptName.locator('xpath=../..');
  const kenmuChip = deptCard.locator('.p.kenmu').filter({ hasText: lastName });
  await expect(kenmuChip).toBeVisible();
  await expect(kenmuChip.locator('.kenmu-mark')).toHaveText('兼');
  await expect(kenmuChip.locator('.kenmu-src')).toContainText(homeDepartment);
  await expect(kenmuChip.locator('.kenmu-src')).toContainText(homeTitle);
});
