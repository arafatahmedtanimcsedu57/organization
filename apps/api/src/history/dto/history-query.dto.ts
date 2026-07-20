import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import type { ChangeLogEntityType } from '../change-log.entity.ts';

/** Optional filters for `GET /history`: by audited entity type/id and/or a `changedAt` time range. */
export class HistoryQueryDto {
  @IsOptional()
  @IsIn(['employee', 'department', 'assignment'])
  entity?: ChangeLogEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
