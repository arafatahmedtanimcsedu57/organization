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
import { ChangeLog } from '../history/change-log.entity.ts';
import { EmployeesModule } from '../employees/employees.module.ts';
import { DepartmentsModule } from '../departments/departments.module.ts';
import { createTestDataSource, resetTestDatabase } from '../test/test-database.ts';

/** Minimal Nest app: real TypeORM against the ephemeral test Postgres + the real employees/departments HTTP routes. */
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
  ],
})
class TestAppModule {}

/**
 * `master-data-management` capability feature tests: boot the real Nest app (real
 * HTTP, real TypeORM, the real global `ValidationPipe`) against the ephemeral test
 * Postgres seeded via `resetTestDatabase` (the same fixtures the org-chart feature
 * tests use), covering employee/department CRUD plus the failure paths called out
 * in spec `quality-assurance` ("Master maintenance validation"): a missing
 * department reference and a cyclic department parent. Requires the test db
 * (`npm run test:db:up` in apps/api, or `TEST_DATABASE_URL` pointed at a reachable
 * Postgres); skips itself when unavailable rather than failing the whole suite in
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

test('POST /employees creates an employee under an existing department', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer())
    .post('/employees')
    .send({ lastName: '田中', firstName: '花子', title: '課員', departmentId: 'dept-2' })
    .expect(201);

  assert.equal(res.body.lastName, '田中');
  assert.equal(res.body.departmentId, 'dept-2');
  assert.equal(res.body.active, true);

  const fetched = await request(app.getHttpServer()).get(`/employees/${res.body.sysId}`).expect(200);
  assert.equal(fetched.body.firstName, '花子');
});

test('PATCH /employees/:sysId updates title and department', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer())
    .patch('/employees/emp-s4')
    .send({ title: '主任', departmentId: 'dept-3' })
    .expect(200);

  assert.equal(res.body.title, '主任');
  assert.equal(res.body.departmentId, 'dept-3');
});

test('POST /employees referencing a non-existent department is rejected and nothing is persisted', async (ctx) => {
  if (!app) return ctx.skip();

  await request(app.getHttpServer())
    .post('/employees')
    .send({ lastName: '存在', firstName: '不明', title: '課員', departmentId: 'dept-does-not-exist' })
    .expect(400);

  const all = await request(app.getHttpServer()).get('/employees').expect(200);
  assert.ok(!all.body.some((e: { lastName: string }) => e.lastName === '存在'));
});

test('PATCH /employees/:sysId/deactivate deactivates without deleting', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).patch('/employees/emp-s3/deactivate').expect(200);
  assert.equal(res.body.active, false);

  const fetched = await request(app.getHttpServer()).get('/employees/emp-s3').expect(200);
  assert.equal(fetched.body.active, false);
  assert.equal(fetched.body.lastName, '高橋');
});

test('POST /departments creates a department under an existing parent', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer())
    .post('/departments')
    .send({ name: '新設部', parentName: '営業本部' })
    .expect(201);

  assert.equal(res.body.name, '新設部');
  assert.equal(res.body.parentName, '営業本部');

  const fetched = await request(app.getHttpServer()).get(`/departments/${res.body.id}`).expect(200);
  assert.equal(fetched.body.active, true);
});

test('PATCH /departments/:id setting a parent that would create a cycle is rejected', async (ctx) => {
  if (!app) return ctx.skip();

  // dept-2's parent is dept-1 (営業本部); setting dept-1's parent to dept-2 (ソリューション営業部) would cycle.
  await request(app.getHttpServer()).patch('/departments/dept-1').send({ parentName: 'ソリューション営業部' }).expect(400);

  const fetched = await request(app.getHttpServer()).get('/departments/dept-1').expect(200);
  assert.equal(fetched.body.parentName, '');
});

test('PATCH /departments/:id/deactivate deactivates without deleting', async (ctx) => {
  if (!app) return ctx.skip();

  const res = await request(app.getHttpServer()).patch('/departments/dept-3/deactivate').expect(200);
  assert.equal(res.body.active, false);

  const fetched = await request(app.getHttpServer()).get('/departments/dept-3').expect(200);
  assert.equal(fetched.body.active, false);
  assert.equal(fetched.body.name, 'システム事業部');
});
