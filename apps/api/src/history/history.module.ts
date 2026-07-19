import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeLog } from './change-log.entity.ts';

/** Exposes the append-only `ChangeLog` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([ChangeLog])],
  exports: [TypeOrmModule],
})
export class HistoryModule {}
