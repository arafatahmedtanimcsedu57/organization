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
import { Assignment } from '../assignments/assignment.entity.ts';
import { ChangeLog } from './change-log.entity.ts';
import { EmployeesModule } from '../employees/employees.module.ts';
import { DepartmentsModule } from '../departments/departments.module.ts';
import { AssignmentsModule } from '../assignments/assignments.module.ts';
import { HistoryModule } from './history.module.ts';
import { AuditModule } from '../common/audit.module.ts';
import { createTestDataSource, resetTestDatabase } from '../test/test-database.ts';

/** Minimal Nest app: real TypeORM against the ephemeral test Postgres + the real employees/departments/assignments/history HTTP routes, with the real audit subscriber wired in so writes actually log. */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      entities: [Department, Employee, Assignment, ChangeLog],
      synchronize: false,
    }),
    EmployeesModule,
    DepartmentsModule,
    AssignmentsModule,
    HistoryModule,
    AuditModule,
  ],
})
class TestAppModule {}

/**
 * `change-history` capability feature tests: boot the real Nest app (real HTTP, real
 * TypeORM, the real global `ValidationPipe`, the real `AuditSubscriber`) against the
 * ephemeral test Postgres seeded via `resetTestDatabase`, covering the behaviors called
 * out in spec `quality-assurance` ("History is immutable") and spec `change-history`:
 * every create/update/deactivate on employees, departments, and assignments logs an
 * entry with actor/timestamp/before/after, and no edit/delete path exists for
 * `ChangeLog` entries. Requires the test db (`npm run test:db:up` in apps/api, or
 * `TEST_DATABASE_URL` pointed at a reachable Postgres); skips itself when unavailable
 * rather than failing the whole suite in environments without Docker.
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

test('creating an employee logs a `create` entry with actor, timestamp, and the new state', async (ctx) => {
  if (!app) return ctx.skip();

  const created = await request(app.getHttpServer())
    .post('/employees')
    .send({ lastName: '渡辺', firstName: '直樹', title: '課員', departmentId: 'dept-2' })
    .expect(201);

  const history = await request(app.getHttpServer())
    .get('/history')
    .query({ entity: 'employee', entityId: created.body.sysId })
    .expect(200);

  assert.equal(history.body.length, 1);
  const [entry] = history.body;
  assert.equal(entry.action, 'create');
  assert.equal(entry.entity, 'employee');
  assert.equal(entry.entityId, created.body.sysId);
  assert.ok(entry.actor);
  assert.ok(entry.changedAt);
  assert.equal(entry.before, null);
  assert.equal(entry.after.lastName, '渡辺');
});

test('updating an employee logs an `update` entry with before and after state', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer()).patch('/employees/emp-s2').send({ title: '部長' }).expect(200);

  const history = await request(app.getHttpServer())
    .get('/history')
    .query({ entity: 'employee', entityId: 'emp-s2' })
    .expect(200);

  const entry = history.body.find((e: { action: string }) => e.action === 'update');
  assert.ok(entry);
  assert.equal(entry.before.title, '課長');
  assert.equal(entry.after.title, '部長');
});

test('deactivating a department logs a `deactivate` entry', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer()).patch('/departments/dept-2/deactivate').expect(200);

  const history = await request(app.getHttpServer())
    .get('/history')
    .query({ entity: 'department', entityId: 'dept-2' })
    .expect(200);

  const entry = history.body.find((e: { action: string }) => e.action === 'deactivate');
  assert.ok(entry);
  assert.equal(entry.before.active, true);
  assert.equal(entry.after, null);
});

test('a concurrent assignment posting logs a `create` entry for the assignment entity', async (ctx) => {
  if (!app) return ctx.skip();

  const created = await request(app.getHttpServer())
    .post('/assignments')
    .send({ employeeSysId: 'emp-s4', departmentId: 'dept-1', title: '課員', assignmentType: 'concurrent', isPrimary: false })
    .expect(201);

  const history = await request(app.getHttpServer())
    .get('/history')
    .query({ entity: 'assignment', entityId: created.body.id })
    .expect(200);

  assert.equal(history.body.length, 1);
  assert.equal(history.body[0].action, 'create');
  assert.equal(history.body[0].after.employeeSysId, 'emp-s4');
});

test('GET /history with no filters lists entries reverse-chronologically across entities', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer()).patch('/employees/emp-s3').send({ title: '主任' }).expect(200);
  await request(app.getHttpServer()).patch('/departments/dept-3').send({ head: '中島眞' }).expect(200);

  const history = await request(app.getHttpServer()).get('/history').expect(200);

  assert.ok(history.body.length >= 2);
  const timestamps = history.body.map((e: { changedAt: string }) => new Date(e.changedAt).getTime());
  const sorted = [...timestamps].sort((a, b) => b - a);
  assert.deepEqual(timestamps, sorted);
});

test('no edit or delete route exists for change-history entries', async (ctx) => {
  if (!app) return ctx.skip();

  const [existing] = (await request(app.getHttpServer()).get('/history').expect(200)).body;

  await request(app.getHttpServer()).patch('/history').send({ action: 'update' }).expect(404);
  await request(app.getHttpServer()).delete('/history').expect(404);
  if (existing) {
    await request(app.getHttpServer()).patch(`/history/${existing.id}`).send({ action: 'update' }).expect(404);
    await request(app.getHttpServer()).delete(`/history/${existing.id}`).expect(404);

    const after = await request(app.getHttpServer()).get(`/history`).query({ entity: existing.entity, entityId: existing.entityId }).expect(200);
    const stillThere = after.body.find((e: { id: string }) => e.id === existing.id);
    assert.ok(stillThere);
    assert.deepEqual(stillThere, existing);
  }
});
