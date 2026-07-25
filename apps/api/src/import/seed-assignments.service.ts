import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CANONICAL_TITLES, findTitleByLabel } from '@org-chart/domain';
import type { AppConfig } from '../config/configuration.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { SEED_ASSIGNMENTS } from './seed-assignments.data.ts';
import type { UpsertCounts } from './upsert-masters.service.ts';

/**
 * Seeds the verifiable concurrent-duty (兼務) rows (see `seed-assignments.data.ts`)
 * into the `assignments` table. `Assignment` has no natural business key besides its
 * generated uuid, so idempotency is keyed on (employeeSysId, departmentId,
 * assignmentType): re-running the seed updates the matching row's title in place
 * instead of inserting a duplicate.
 */
@Injectable()
export class SeedAssignmentsService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async seedConcurrentAssignments(): Promise<UpsertCounts> {
    // `SEED_ASSIGNMENTS` carries canonical Japanese titles; translate them so the
    // seeded (兼) chips read in the same language as the rest of the dataset.
    const lang = this.config.get('import.lang', { infer: true });
    const existing = await this.assignmentRepo.find({ where: { assignmentType: 'concurrent' } });
    const existingByKey = new Map(existing.map((a) => [`${a.employeeSysId}:${a.departmentId}`, a]));

    let inserted = 0;
    let updated = 0;
    for (const seed of SEED_ASSIGNMENTS) {
      const key = `${seed.employeeSysId}:${seed.departmentId}`;
      const row = existingByKey.get(key);
      // Resolve the seed's canonical title to a managed title; the `title` cache reads
      // in the dataset's language (from the title record, replacing translateTitle).
      const title = findTitleByLabel(CANONICAL_TITLES, seed.title);
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          id: row?.id,
          employeeSysId: seed.employeeSysId,
          departmentId: seed.departmentId,
          title: title ? (lang === 'en' ? title.nameEn : title.name) : seed.title,
          titleId: title?.id ?? null,
          isPrimary: false,
          assignmentType: seed.type,
          validFrom: null,
          validTo: null,
        }),
      );
      if (row) updated++;
      else inserted++;
    }
    return { inserted, updated };
  }
}
