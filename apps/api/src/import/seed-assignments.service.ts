import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  constructor(@InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>) {}

  async seedConcurrentAssignments(): Promise<UpsertCounts> {
    const existing = await this.assignmentRepo.find({ where: { assignmentType: 'concurrent' } });
    const existingByKey = new Map(existing.map((a) => [`${a.employeeSysId}:${a.departmentId}`, a]));

    let inserted = 0;
    let updated = 0;
    for (const seed of SEED_ASSIGNMENTS) {
      const key = `${seed.employeeSysId}:${seed.departmentId}`;
      const row = existingByKey.get(key);
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          id: row?.id,
          employeeSysId: seed.employeeSysId,
          departmentId: seed.departmentId,
          title: seed.title,
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
