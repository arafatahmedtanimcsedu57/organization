import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { DepartmentTitlesService } from './department-titles.service.ts';
import { Title } from '../titles/title.entity.ts';
import { DepartmentTitle } from './department-title.entity.ts';
import { AssignTitleDto } from './dto/assign-title.dto.ts';

/** `master-data-management` capability: the Department↔Title assignment, consumed by the Settings UI. */
@Controller('departments')
export class DepartmentTitlesController {
  constructor(private readonly departmentTitlesService: DepartmentTitlesService) {}

  @Get(':id/titles')
  list(@Param('id') id: string): Promise<Title[]> {
    return this.departmentTitlesService.listTitles(id);
  }

  @Post(':id/titles')
  assign(@Param('id') id: string, @Body() dto: AssignTitleDto): Promise<DepartmentTitle> {
    return this.departmentTitlesService.assign(id, dto.titleId);
  }

  @Delete(':id/titles/:titleId')
  unassign(@Param('id') id: string, @Param('titleId') titleId: string): Promise<void> {
    return this.departmentTitlesService.unassign(id, titleId);
  }
}
