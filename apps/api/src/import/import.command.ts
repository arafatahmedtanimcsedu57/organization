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
import { SeedTitlesService } from './seed-titles.service.ts';
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
    const seedTitles = context.get(SeedTitlesService);

    const departments = readMasters.readDepartments(path.join(sourceDir, 'cmn_department.xlsx'));
    const employees = readMasters.readEmployees(path.join(sourceDir, 'sys_user.xlsx'));
    logger.log(`Read ${departments.length} departments and ${employees.length} employees from ${sourceDir}`);

    const departmentCounts = await upsertMasters.upsertDepartments(departments);
    logger.log(
      `Departments: ${departmentCounts.inserted} inserted, ${departmentCounts.updated} updated (${departments.length} total)`,
    );

    // Seed the managed titles before employees, whose `title_id` FK references them.
    const titleCounts = await seedTitles.seedCanonicalTitles();
    logger.log(`Titles: ${titleCounts.inserted} inserted, ${titleCounts.updated} updated`);

    const departmentIdByName = new Map(departments.map((d) => [d.name, d.id]));
    const employeeResult = await upsertMasters.upsertEmployees(employees, departmentIdByName);
    logger.log(
      `Employees: ${employeeResult.inserted} inserted, ${employeeResult.updated} updated (${employees.length} total)`,
    );

    // After employees exist, anchor each department's head to a Sys ID.
    const headBackfill = await upsertMasters.backfillDepartmentHeads(departments, employees);
    logger.log(
      `Department heads: ${headBackfill.resolved} resolved to a Sys ID, ${headBackfill.unresolved} unresolved`,
    );

    const assignmentCounts = await seedAssignments.seedConcurrentAssignments();
    logger.log(
      `Assignments (兼務): ${assignmentCounts.inserted} inserted, ${assignmentCounts.updated} updated`,
    );

    // With every posting's title_id set, assign each department the titles it uses.
    const deptTitleCounts = await seedTitles.seedDepartmentTitles();
    logger.log(`Department-title links: ${deptTitleCounts.inserted} pairs ensured`);

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
