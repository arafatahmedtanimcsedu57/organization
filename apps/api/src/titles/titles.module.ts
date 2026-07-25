import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Title } from './title.entity.ts';
import { TitlesService } from './titles.service.ts';
import { TitlesController } from './titles.controller.ts';

/** `master-data-management` capability: title CRUD, and exposes the `Title` repository to other feature modules. */
@Module({
  imports: [TypeOrmModule.forFeature([Title])],
  controllers: [TitlesController],
  providers: [TitlesService],
  exports: [TypeOrmModule],
})
export class TitlesModule {}
