import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '../config/configuration.ts';
import type { AppConfig } from '../config/configuration.ts';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import { ReadMastersService } from './read-masters.service.ts';
import { UpsertMastersService } from './upsert-masters.service.ts';
import { SeedAssignmentsService } from './seed-assignments.service.ts';
import { SeedTitlesService } from './seed-titles.service.ts';

/**
 * `data-import` capability: reads the provided masters at seed time (SheetJS,
 * no request path) and upserts them into Postgres.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        type: 'postgres' as const,
        url: configService.get('database.url', { infer: true }),
        entities: [Department, Employee, Assignment, Title, DepartmentTitle],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Department, Employee, Assignment, Title, DepartmentTitle]),
  ],
  providers: [ReadMastersService, UpsertMastersService, SeedAssignmentsService, SeedTitlesService],
  exports: [ReadMastersService, UpsertMastersService, SeedAssignmentsService, SeedTitlesService],
})
export class ImportModule {}
