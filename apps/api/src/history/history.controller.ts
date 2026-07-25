import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service.ts';
import { ChangeLog } from './change-log.entity.ts';
import { HistoryQueryDto } from './dto/history-query.dto.ts';

/**
 * `change-history` capability: read-only browsing of the audit trail, filterable by entity
 * and time. Deliberately GET-only - no route to edit or delete a `ChangeLog` entry exists.
 */
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query() query: HistoryQueryDto): Promise<ChangeLog[]> {
    return this.historyService.findAll(query);
  }
}
