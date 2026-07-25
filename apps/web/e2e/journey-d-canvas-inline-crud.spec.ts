import { expect, test } from '@playwright/test';
import { removeAssignmentsFor } from './assignment-helpers';

/**
 * Journey D (`chart-canvas` spec, `redesign-org-chart-canvas`): edit master data directly
 * from the Top-down canvas - select a department node, edit the department, and add a
 * concurrent (兼務) posting - and see the canvas reflect the changes without a manual
 * reload. Runs against the real app stack (`docker compose up`), not a mock.
 */

test('select a canvas node, edit the department, and add a 兼務 posting inline', async ({ page }) => {
  await page.goto('/chart');
  const canvas = page.locator('.topdown-canvas');
  await expect(canvas).toBeVisible();

  // --- Select a node → the inline editor panel opens for that department ---
  const node = page.locator('.topdown-node').first();
  const deptName = (await node.locator('.dn').innerText()).trim();
  await node.click();

  const editor = page.locator('.canvas-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText(deptName);

  // --- Edit department: change the head to a unique value, verify, then restore ---
  await editor.getByRole('button', { name: 'Edit department' }).click();
  const headInput = page.locator('#cv-dept-head');
  await expect(headInput).toBeVisible();
  // The edit section renders only once populated from /departments - never with an empty name.
  await expect(page.locator('#cv-dept-name')).not.toHaveValue('');
  const originalHead = await headInput.inputValue();
  const newHead = `E2E統括 ${Date.now() % 100000}`;
  await headInput.fill(newHead);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(headInput).toHaveCount(0); // editor section closed on success

  // Persisted: reopening the editor shows the saved head. Then restore the original
  // value with a second save, so the shared seeded database is left unchanged.
  await editor.getByRole('button', { name: 'Edit department' }).click();
  await expect(headInput).toHaveValue(newHead);
  await headInput.fill(originalHead);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(headInput).toHaveCount(0);

  // --- Add a 兼務 posting into this department from the canvas ---
  // The editor's roster is scoped to this selected department; a concurrent posting placed
  // here adds a distinct 兼 chip to it. (Concurrent postings are freely duplicable - only a
  // second *primary* is rejected - so the create always succeeds and always adds one chip.)
  const chipsBefore = await editor.locator('.kenmu-mark').count();

  await editor.getByRole('button', { name: 'Add posting (兼務)' }).click();
  const person = page.locator('#cv-asn-person');
  await expect(person).toBeVisible();
  const options = person.locator('option:not([disabled])');
  const lastOption = (await options.allTextContents()).map((t) => t.trim()).filter(Boolean).pop();
  if (!lastOption) throw new Error('no selectable person for the posting');
  const personUserId = lastOption.match(/\(([^)]+)\)\s*$/)?.[1];
  await person.selectOption({ label: lastOption });
  await page.locator('#cv-asn-title').fill('部長');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(person).toHaveCount(0); // editor section closed on success

  // The canvas reflects the new posting without a manual reload: the selected department's
  // roster in the editor gains a 兼 chip once the chart refetches.
  await expect
    .poll(async () => editor.locator('.kenmu-mark').count(), {
      message: 'expected a new 兼 chip in the department roster after saving',
    })
    .toBeGreaterThan(chipsBefore);

  // Cleanup: remove the posting this test created, so repeated runs stay deterministic.
  if (personUserId) await removeAssignmentsFor(page, personUserId, deptName);
});
