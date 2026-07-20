import { expect, test } from '@playwright/test';

/**
 * Journey B (task 13.9, `quality-assurance` spec): edit an employee's title in the
 * maintenance UI, confirm the org chart re-renders with the new title, and confirm a
 * change-history entry appears with the before/after. Runs against the real app stack
 * (`docker compose up`), not a mock — see `E2E_BASE_URL` / `playwright.config.ts`.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('edit an employee, see the chart and change history update', async ({ page }) => {
  // --- Employees → pick the first row → edit its title → Save (the write path) ---
  await page.goto('/admin/employees');
  await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();

  const row = page.locator('.itable tbody tr').first();
  const userId = (await row.locator('td').nth(0).innerText()).trim();
  const fullName = (await row.locator('.person b').innerText()).trim();
  const lastName = fullName.split(/\s+/)[0];
  const departmentName = (await row.locator('.dept').innerText()).trim();
  const beforeTitle = (await row.locator('td').nth(2).innerText()).trim();
  const afterTitle = beforeTitle === '課員' ? '主任' : '課員';

  await row.getByRole('button', { name: 'Edit' }).click();

  const titleInput = page.locator('#emp-title');
  await expect(titleInput).toHaveValue(beforeTitle);
  await titleInput.fill(afterTitle);

  await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('heading', { name: 'Edit employee' })).toHaveCount(0);
  await expect(row.locator('td').nth(2)).toHaveText(afterTitle);

  // --- Org chart re-renders with the edit ---
  await page.goto('/chart');
  const deptName = page.locator('.dn').filter({ hasText: new RegExp(`^${escapeRegExp(departmentName)}$`) });
  const deptCard = deptName.locator('xpath=../..');
  const titleLine = deptCard.locator('.line').filter({
    has: page.locator('.pos', { hasText: new RegExp(`^${escapeRegExp(afterTitle)}$`) }),
  });
  await expect(titleLine.locator('.p').filter({ hasText: lastName }).first()).toBeVisible();

  // --- Change history shows the new entry with before/after ---
  await page.goto('/history');
  await page.getByLabel('Entity type').selectOption('employee');
  const recordSelect = page.getByLabel('Specific record');
  await expect(recordSelect).toContainText(fullName);
  await recordSelect.selectOption({ label: `${fullName} (${userId})` });

  const historyRow = page.locator('.itable tbody tr').first();
  await expect(historyRow).toContainText('Updated');
  const changes = historyRow.locator('td').last();
  await expect(changes).toContainText('Title:');
  await expect(changes).toContainText(beforeTitle);
  await expect(changes).toContainText(afterTitle);
});
