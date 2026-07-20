import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { AssignmentsService } from './assignments.service.ts';
import { Assignment } from './assignment.entity.ts';
import { CreateAssignmentDto } from './dto/create-assignment.dto.ts';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.ts';

/** `concurrent-duties` capability: assignment (primary/兼務) CRUD, consumed by the admin UI. */
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(): Promise<Assignment[]> {
    return this.assignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Assignment> {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssignmentDto): Promise<Assignment> {
    return this.assignmentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto): Promise<Assignment> {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.assignmentsService.remove(id);
  }
}
