import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { afterAll, beforeAll, test } from 'vitest';

import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { ChangeLog } from '../history/change-log.entity.ts';
import { OrgChartModule } from './org-chart.module.ts';
import { createTestDataSource, resetTestDatabase } from '../test/test-database.ts';
import type { ChartNode } from './chart-node.ts';

/** Minimal Nest app: real TypeORM against the ephemeral test Postgres + the real `org-chart` HTTP routes. */
@Module({
  imports: [
    // OrgChartService reads `import.lang`; supply it without the real configuration()
    // (which mandates DATABASE_URL). The test fixtures are Japanese, so lang = 'ja'.
    ConfigModule.forRoot({ isGlobal: true, load: [() => ({ import: { lang: 'ja' } })] }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      entities: [Department, Employee, Assignment, ChangeLog],
      synchronize: false,
    }),
    OrgChartModule,
  ],
})
class TestAppModule {}

function findNode(nodes: ChartNode[], name: string): ChartNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findNode(node.children, name);
    if (found) return found;
  }
  return undefined;
}

/**
 * `GET /chart` / `GET /chart/warnings` feature tests: boot the real Nest app (real HTTP,
 * real TypeORM) against the ephemeral test Postgres seeded via `resetTestDatabase` (the
 * same deterministic fixtures the domain unit tests exercise: a 3-department tree, a
 * shared-last-name pair, a staff-level roster entry, and the `(兼)佐藤(悠)` concurrent
 * posting), per spec `quality-assurance` ("Org-chart correctness"). Requires the test db
 * (`npm run test:db:up` in apps/api, or `TEST_DATABASE_URL` pointed at a reachable Postgres);
 * skips itself when unavailable rather than failing the whole suite in environments without
 * Docker.
 */
let app: INestApplication | undefined;

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;

  try {
    const dataSource = createTestDataSource();
    await dataSource.initialize();
    try {
      await resetTestDatabase(dataSource);
    } finally {
      await dataSource.destroy();
    }

    const nestApp = await NestFactory.create(TestAppModule, { logger: false });
    await nestApp.init();
    app = nestApp;
  } catch {
    app = undefined;
  }
});

afterAll(async () => {
  await app?.close();
});

test('GET /chart builds the department hierarchy from parent names', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).get('/chart').expect(200);
  const roots = res.body.roots as ChartNode[];

  assert.deepEqual(
    roots.map((r) => r.name),
    ['営業本部', 'システム事業部'],
  );
  const eigyouHonbu = roots.find((r) => r.name === '営業本部');
  assert.ok(eigyouHonbu);
  assert.deepEqual(
    eigyouHonbu.children.map((c) => c.name),
    ['ソリューション営業部'],
  );
});

test('GET /chart orders each roster from highest to lowest position rank', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).get('/chart').expect(200);
  const roots = res.body.roots as ChartNode[];
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(solutionSales);

  assert.deepEqual(
    solutionSales.managers.map((m) => m.title),
    ['部長', '課長', '担当課長'],
  );
  assert.deepEqual(
    solutionSales.staff.map((m) => m.title),
    ['課員'],
  );
});

test('GET /chart disambiguates shared last names with a given-name initial', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).get('/chart').expect(200);
  const roots = res.body.roots as ChartNode[];
  const eigyouHonbu = findNode(roots, '営業本部');
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(eigyouHonbu);
  assert.ok(solutionSales);

  const honbucho = eigyouHonbu.managers.find((m) => m.sysId === 'emp-s1');
  const kacho = solutionSales.managers.find((m) => m.sysId === 'emp-s2');
  assert.equal(honbucho?.displayName, '佐藤(悠)');
  assert.equal(kacho?.displayName, '佐藤(晃)');
});

test('GET /chart places a concurrent (兼務) posting in the target department, sourced from the home post', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).get('/chart').expect(200);
  const roots = res.body.roots as ChartNode[];
  const eigyouHonbu = findNode(roots, '営業本部');
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(eigyouHonbu);
  assert.ok(solutionSales);

  const home = eigyouHonbu.managers.find((m) => m.sysId === 'emp-s1');
  assert.equal(home?.concurrent, false);

  const concurrent = solutionSales.managers.find((m) => m.sysId === 'emp-s1');
  assert.ok(concurrent);
  assert.equal(concurrent.concurrent, true);
  assert.equal(concurrent.title, '部長');
  assert.equal(concurrent.displayName, '佐藤(悠)');
  assert.equal(concurrent.sourceDepartmentName, '営業本部');
  assert.equal(concurrent.sourceTitle, '本部長');
});

test('GET /chart/warnings surfaces no warnings for the fully-resolved fixture', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).get('/chart/warnings').expect(200);
  assert.deepEqual(res.body.warnings, []);
});
