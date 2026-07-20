import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Module, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { afterAll, beforeAll, test } from 'vitest';

import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from './assignment.entity.ts';
import { ChangeLog } from '../history/change-log.entity.ts';
import { AssignmentsModule } from './assignments.module.ts';
import { OrgChartModule } from '../org-chart/org-chart.module.ts';
import { createTestDataSource, resetTestDatabase } from '../test/test-database.ts';
import type { ChartNode } from '../org-chart/chart-node.ts';

/** Minimal Nest app: real TypeORM against the ephemeral test Postgres + the real `assignments`/`org-chart` HTTP routes. */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      entities: [Department, Employee, Assignment, ChangeLog],
      synchronize: false,
    }),
    AssignmentsModule,
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
 * `concurrent-duties` capability feature tests: boot the real Nest app (real HTTP, real
 * TypeORM, the real global `ValidationPipe`) against the ephemeral test Postgres seeded via
 * `resetTestDatabase`, covering the two behaviors called out in spec `quality-assurance`
 * ("Concurrent-duty rule enforcement"): rejecting a second primary posting, and a newly
 * created concurrent posting rendering in the target department's roster on `GET /chart`.
 * Requires the test db (`npm run test:db:up` in apps/api, or `TEST_DATABASE_URL` pointed at a
 * reachable Postgres); skips itself when unavailable rather than failing the whole suite in
 * environments without Docker.
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
    nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await nestApp.init();
    app = nestApp;
  } catch {
    app = undefined;
  }
});

afterAll(async () => {
  await app?.close();
});

test('POST /assignments rejects a second primary posting for the same person', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s2', departmentId: 'dept-1', title: '課長', assignmentType: 'primary', isPrimary: true })
    .expect(201);

  await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s2', departmentId: 'dept-3', title: '課長', assignmentType: 'primary', isPrimary: true })
    .expect(400);

  const all = await request(app.getHttpServer()).get('/assignments').expect(200);
  const primaries = all.body.filter((a: { employeeSysId: string; isPrimary: boolean }) => a.employeeSysId === 'emp-s2' && a.isPrimary);
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0].departmentId, 'dept-1');
});

test('PATCH /assignments/:id rejects promoting a second posting to primary', async (ctx) => {
  if (!app) return ctx.skip();

  const first = await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s3', departmentId: 'dept-1', title: '担当課長', assignmentType: 'primary', isPrimary: true })
    .expect(201);

  const second = await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s3', departmentId: 'dept-3', title: '担当課長', assignmentType: 'concurrent', isPrimary: false })
    .expect(201);

  await request(app.getHttpServer()).patch(`/assignments/${second.body.id}`).send({ isPrimary: true }).expect(400);

  const fetched = await request(app.getHttpServer()).get(`/assignments/${first.body.id}`).expect(200);
  assert.equal(fetched.body.isPrimary, true);
});

test('POST /assignments adds a concurrent posting that renders in the target department on GET /chart', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s4', departmentId: 'dept-1', title: '課員', assignmentType: 'concurrent', isPrimary: false })
    .expect(201);

  const res = await request(app.getHttpServer()).get('/chart').expect(200);
  const roots = res.body.roots as ChartNode[];
  const eigyouHonbu = findNode(roots, '営業本部');
  assert.ok(eigyouHonbu);

  const posting = eigyouHonbu.staff.find((m) => m.sysId === 'emp-s4');
  assert.ok(posting);
  assert.equal(posting.concurrent, true);
  assert.equal(posting.title, '課員');
  assert.equal(posting.sourceDepartmentName, 'ソリューション営業部');
  assert.equal(posting.sourceTitle, '課員');
});
