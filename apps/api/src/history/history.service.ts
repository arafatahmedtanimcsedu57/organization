import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { ChangeLog } from './change-log.entity.ts';
import type { HistoryQueryDto } from './dto/history-query.dto.ts';

/**
 * `change-history` capability: read-only queries over the append-only `ChangeLog`.
 * No create/update/delete methods exist here - that's what keeps history immutable.
 */
@Injectable()
export class HistoryService {
  constructor(@InjectRepository(ChangeLog) private readonly changeLogRepo: Repository<ChangeLog>) {}

  findAll(filter: HistoryQueryDto): Promise<ChangeLog[]> {
    const where: FindOptionsWhere<ChangeLog> = {};
    if (filter.entity) where.entity = filter.entity;
    if (filter.entityId) where.entityId = filter.entityId;

    if (filter.from && filter.to) {
      where.changedAt = Between(new Date(filter.from), new Date(filter.to));
    } else if (filter.from) {
      where.changedAt = MoreThanOrEqual(new Date(filter.from));
    } else if (filter.to) {
      where.changedAt = LessThanOrEqual(new Date(filter.to));
    }

    return this.changeLogRepo.find({ where, order: { changedAt: 'DESC' } });
  }
}
