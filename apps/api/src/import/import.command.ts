import 'reflect-metadata';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ImportModule } from './import.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { ReadMastersService } from './read-masters.service.ts';
import { UpsertMastersService } from './upsert-masters.service.ts';
import { SeedAssignmentsService } from './seed-assignments.service.ts';
import { findPhantomDepartmentHeadWarnings, type ImportWarning } from './import-warnings.ts';

/**
 * Seed-time entrypoint (`npm run seed`): reads the `sys_user` / `cmn_department`
 * masters with SheetJS and upserts them into Postgres, keyed by department `id`
 * and employee `Sys ID` so re-running is idempotent. Also seeds the three
 * verifiable 兼務 (concurrent-duty) assignment rows.
 */
async function run() {
  const logger = new Logger('Import');
  const context = await NestFactory.createApplicationContext(ImportModule);

  try {
    const configService = context.get(ConfigService<AppConfig, true>);
    const sourceDir = configService.get('import.sourceDir', { infer: true });
    const readMasters = context.get(ReadMastersService);
    const upsertMasters = context.get(UpsertMastersService);
    const seedAssignments = context.get(SeedAssignmentsService);

    const departments = readMasters.readDepartments(path.join(sourceDir, 'cmn_department.xlsx'));
    const employees = readMasters.readEmployees(path.join(sourceDir, 'sys_user.xlsx'));
    logger.log(`Read ${departments.length} departments and ${employees.length} employees from ${sourceDir}`);

    const departmentCounts = await upsertMasters.upsertDepartments(departments);
    logger.log(
      `Departments: ${departmentCounts.inserted} inserted, ${departmentCounts.updated} updated (${departments.length} total)`,
    );

    const departmentIdByName = new Map(departments.map((d) => [d.name, d.id]));
    const employeeResult = await upsertMasters.upsertEmployees(employees, departmentIdByName);
    logger.log(
      `Employees: ${employeeResult.inserted} inserted, ${employeeResult.updated} updated (${employees.length} total)`,
    );

    const assignmentCounts = await seedAssignments.seedConcurrentAssignments();
    logger.log(
      `Assignments (兼務): ${assignmentCounts.inserted} inserted, ${assignmentCounts.updated} updated`,
    );

    const warnings: ImportWarning[] = [
      ...employeeResult.warnings,
      ...findPhantomDepartmentHeadWarnings(departments, employees),
    ];
    if (warnings.length > 0) {
      logger.warn(`Import warnings (${warnings.length}):`);
      for (const warning of warnings) logger.warn(`  [${warning.kind}] ${warning.message}`);
    } else {
      logger.log('Import warnings: none');
    }
  } finally {
    await context.close();
  }
}

run().catch((err: unknown) => {
  console.error('[import] failed:', err);
  process.exitCode = 1;
});
