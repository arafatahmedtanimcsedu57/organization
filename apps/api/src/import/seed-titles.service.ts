import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CANONICAL_TITLES } from '@org-chart/domain';
import { Title } from '../titles/title.entity.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import type { UpsertCounts } from './upsert-masters.service.ts';

/**
 * Seeds the managed-title reference data: the canonical `titles` rows, and the
 * `department_titles` links derived from what the imported postings actually use
 * (so every existing employee/兼務 title stays valid). Both idempotent - safe to
 * re-run on `npm run seed`.
 */
@Injectable()
export class SeedTitlesService {
  constructor(
    @InjectRepository(Title) private readonly titleRepo: Repository<Title>,
    @InjectRepository(DepartmentTitle) private readonly departmentTitleRepo: Repository<DepartmentTitle>,
  ) {}

  /** Upsert the canonical title set (keyed by id) into the `titles` table. */
  async seedCanonicalTitles(): Promise<UpsertCounts> {
    const existing = new Set((await this.titleRepo.find({ select: ['id'] })).map((t) => t.id));
    await this.titleRepo.save(CANONICAL_TITLES.map((t) => this.titleRepo.create({ ...t })));
    const inserted = CANONICAL_TITLES.filter((t) => !existing.has(t.id)).length;
    return { inserted, updated: CANONICAL_TITLES.length - inserted };
  }

  /**
   * Assign each department the titles its active employees and concurrent postings
   * actually use, so the imported data satisfies the "title must be assigned to the
   * department" rule out of the box. `orIgnore` makes re-runs no-ops.
   */
  async seedDepartmentTitles(): Promise<{ inserted: number }> {
    const pairs: { department_id: string; title_id: string }[] = await this.departmentTitleRepo.query(
      `SELECT DISTINCT department_id, title_id FROM employees WHERE active = true AND title_id IS NOT NULL
       UNION
       SELECT DISTINCT department_id, title_id FROM assignments WHERE title_id IS NOT NULL`,
    );
    if (pairs.length === 0) return { inserted: 0 };

    await this.departmentTitleRepo
      .createQueryBuilder()
      .insert()
      .values(pairs.map((p) => ({ departmentId: p.department_id, titleId: p.title_id })))
      .orIgnore()
      .execute();
    return { inserted: pairs.length };
  }
}
