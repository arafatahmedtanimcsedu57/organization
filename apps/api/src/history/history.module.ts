import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeLog } from './change-log.entity.ts';
import { HistoryService } from './history.service.ts';
import { HistoryController } from './history.controller.ts';

/**
 * `change-history` capability: read-only `GET /history` API, and exposes the append-only
 * `ChangeLog` repository to other feature modules (e.g. the audit subscriber) via DI.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ChangeLog])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [TypeOrmModule],
})
export class HistoryModule {}
