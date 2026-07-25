import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TitlesService } from './titles.service.ts';
import { Title } from './title.entity.ts';
import { CreateTitleDto } from './dto/create-title.dto.ts';
import { UpdateTitleDto } from './dto/update-title.dto.ts';

/** `master-data-management` capability: title CRUD + deactivation, consumed by the Settings UI. */
@Controller('titles')
export class TitlesController {
  constructor(private readonly titlesService: TitlesService) {}

  @Get()
  findAll(): Promise<Title[]> {
    return this.titlesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Title> {
    return this.titlesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTitleDto): Promise<Title> {
    return this.titlesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTitleDto): Promise<Title> {
    return this.titlesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<Title> {
    return this.titlesService.deactivate(id);
  }
}
