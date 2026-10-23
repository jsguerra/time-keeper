import assert from 'node:assert/strict';
import { once } from 'node:events';
import { resolve } from 'node:path';
import express from 'express';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/database.js';
import { SqliteTimeRepository } from '../server/repository.js';

const db = openDatabase(':memory:');
const repository = new SqliteTimeRepository(db);
const app = createApp(repository);
app.use(express.static(resolve('dist', 'client')));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert(address && typeof address === 'object');
const origin = `http://127.0.0.1:${address.port}`;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let scans = 0;

try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  async function scan(label: string) {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    assert.deepEqual(result.violations.map(issue => ({
      rule: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => ({ target: node.target, reason: node.failureSummary })),
    })), [], `Accessibility violations: ${label}`);
    scans++;
    console.log(`PASS axe: ${label}`);
  }
  async function closeDialog() {
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  async function assertLayout(label: string) {
    const layout = await page.evaluate(() => {
      const smallText = [...document.querySelectorAll<HTMLElement>('body *')].filter(element => {
        const style = getComputedStyle(element);
        return element.getClientRects().length && style.visibility !== 'hidden'
          && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
          && parseFloat(style.fontSize) > 0 && parseFloat(style.fontSize) < 14;
      }).map(element => `${element.tagName}: ${element.textContent?.slice(0, 50)}`);
      const overflow = [...document.querySelectorAll<HTMLElement>('body *')].filter(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.right > document.documentElement.clientWidth + 1 && !element.closest('[role="region"][tabindex="0"]');
      }).slice(0, 8).map(element => `${element.tagName}.${element.className}`);
      return { width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, smallText, overflow };
    });
    assert(layout.content <= layout.width + 1, `${label}: document overflows horizontally (${layout.content}/${layout.width}); ${layout.overflow.join(', ')}`);
    assert.deepEqual(layout.smallText, [], `${label}: visible text below 14px`);
  }

  await page.goto(origin);
  await page.getByRole('button', { name: 'Add your first person' }).waitFor();
  await scan('empty overview');
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main').evaluate(element => element === document.activeElement), true);
  await page.getByRole('button', { name: 'Add your first person' }).click();
  await scan('create person dialog');
  const dialog = page.getByRole('dialog');
  assert.match(await dialog.getAttribute('aria-describedby') ?? '', /\S/);
  const buttons = dialog.getByRole('button');
  await buttons.last().focus();
  await page.keyboard.press('Tab');
  assert.equal(await buttons.first().evaluate(element => element === document.activeElement), true, 'Dialog must trap forward Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await buttons.last().evaluate(element => element === document.activeElement), true, 'Dialog must trap reverse Tab');
  await closeDialog();
  assert.equal(await page.getByRole('button', { name: 'Add your first person' }).evaluate(element => element === document.activeElement), true, 'Escape should return focus to opener');
  await page.getByRole('button', { name: 'Create your first project' }).click();
  await scan('create project dialog');
  await closeDialog();

  repository.saveUser({ name: 'Alex Morgan', ratePence: 4500 });
  repository.saveUser({ name: 'Jamie Taylor', ratePence: 6000 });
  repository.saveProject({ name: 'Website redesign', client: 'Acme Studio', ratePence: 7500, color: '#ffffff' });
  repository.saveProject({ name: 'Brand strategy', client: '', ratePence: null, color: '#3b82f6' });
  const end = new Date(Date.now() - 3600000);
  repository.addEntry({ userId: 1, projectId: 1, description: 'Discovery and wireframes', startedAt: new Date(end.getTime() - 9000000).toISOString(), endedAt: end.toISOString(), ratePence: 7500 });
  repository.addEntry({ userId: 2, projectId: 2, description: 'Strategy workshop', startedAt: new Date(end.getTime() - 3600000).toISOString(), endedAt: end.toISOString(), ratePence: 6000 });
  await page.goto(origin);
  await page.getByRole('button', { name: 'Start timer', exact: true }).waitFor();
  await page.getByLabel('Report period').selectOption('all');
  await scan('populated overview with custom white project colour');
  await page.getByText('View daily activity data', { exact: true }).click();
  assert.equal(await page.getByRole('table', { name: 'Completed hours by start date' }).isVisible(), true);
  await scan('expanded daily activity table');

  for (const [name, heading] of [
    ['Time entries', 'Every hour has a story.'],
    ['Projects', 'Good work, well organised.'],
    ['People', 'The people making it happen.'],
  ]) {
    await page.getByRole('link', { name, exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: heading, exact: true }).evaluate(element => element === document.activeElement), true, `${name}: focus should move to heading`);
    await scan(name);
    await page.getByRole('link', { name: 'Skip to content' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('heading', { name: heading, exact: true }).isVisible(), true, 'Skip link must not reset the route');
  }
  await page.getByRole('button', { name: 'Edit Alex Morgan' }).click();
  await scan('edit person');
  await closeDialog();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Website redesign' }).click();
  await scan('edit project');
  await closeDialog();

  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Add time entry', exact: true }).click();
  await scan('manual entry dialog');
  await dialog.getByLabel('Project', { exact: true }).selectOption('1');
  await dialog.getByLabel('Person', { exact: true }).selectOption('1');
  await dialog.getByLabel('Start', { exact: true }).fill('2026-10-20T12:00');
  await dialog.getByLabel('End', { exact: true }).fill('2026-10-20T11:00');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel('End', { exact: true }).getAttribute('aria-invalid'), 'true');
  await scan('manual entry validation error');
  await closeDialog();
  await page.getByRole('button', { name: /^Delete Website redesign entry/ }).click();
  await scan('delete confirmation');
  await closeDialog();
  await page.getByLabel('Report period').selectOption('custom');
  await page.getByLabel('From date').fill('2026-10-23');
  await page.getByLabel('To date').fill('2026-10-22');
  await page.getByRole('alert').waitFor();
  await scan('custom date validation error');
  await page.getByLabel('Report period').selectOption('all');

  const timer = page.getByRole('region', { name: 'Track time', exact: true });
  await timer.getByLabel('Project', { exact: true }).selectOption('1');
  await timer.getByLabel('Person', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  const stopButton = page.getByRole('button', { name: 'Stop timer', exact: true });
  await stopButton.waitFor();
  assert.equal(await stopButton.evaluate(element => element === document.activeElement), true);
  assert.equal(await page.getByRole('timer').getAttribute('aria-live'), 'off');
  await scan('running timer and status message');
  await stopButton.click();
  await page.getByRole('button', { name: 'Start timer', exact: true }).waitFor();

  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ['Overview', 'Time entries', 'Projects', 'People']) {
      await page.getByRole('link', { name, exact: true }).click();
      await assertLayout(`${name} at ${width}px`);
    }
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await scan(`overview at ${width}px`);
    await page.getByRole('button', { name: 'Add time entry', exact: true }).click();
    await assertLayout(`dialog at ${width}px`);
    await scan(`dialog at ${width}px`);
    await closeDialog();
  }
  await page.setViewportSize({ width: 640, height: 500 });
  await page.addStyleTag({ content: ':root { font-size: 200%; }' });
  for (const name of ['Overview', 'Time entries', 'Projects', 'People']) {
    await page.getByRole('link', { name, exact: true }).click();
    await assertLayout(`${name} with 200% text at 640px (1280px browser at 200% zoom)`);
  }
  await page.getByRole('button', { name: 'Add person', exact: true }).click();
  await assertLayout('dialog with 200% text');
  await scan('200% text enlargement');
  await closeDialog();
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await assertLayout('enlarged text with custom spacing');
  console.log(`PASS ${scans} axe scans; keyboard, dialog focus, chart alternative, responsive layout, 200% text and text-spacing checks.`);
} finally {
  await browser?.close();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
}
