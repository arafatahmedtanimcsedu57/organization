import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Title } from './title.entity.ts';
import type { CreateTitleDto } from './dto/create-title.dto.ts';
import type { UpdateTitleDto } from './dto/update-title.dto.ts';

/** kebab-case slug for a human-readable, stable title id. */
function slugify(source: string): string {
  return source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `master-data-management` capability: CRUD + non-destructive deactivation for titles. */
@Injectable()
export class TitlesService {
  constructor(@InjectRepository(Title) private readonly titleRepo: Repository<Title>) {}

  findAll(): Promise<Title[]> {
    return this.titleRepo.find({ order: { rank: 'ASC' } });
  }

  async findOne(id: string): Promise<Title> {
    const title = await this.titleRepo.findOne({ where: { id } });
    if (!title) {
      throw new NotFoundException(`Title ${id} not found`);
    }
    return title;
  }

  async create(dto: CreateTitleDto): Promise<Title> {
    const title = this.titleRepo.create({
      id: await this.generateId(dto.nameEn || dto.name),
      name: dto.name,
      nameEn: dto.nameEn ?? '',
      rank: dto.rank,
      staffLevel: dto.staffLevel ?? false,
      active: true,
    });
    return this.titleRepo.save(title);
  }

  async update(id: string, dto: UpdateTitleDto): Promise<Title> {
    const title = await this.findOne(id);
    if (dto.name !== undefined) title.name = dto.name;
    if (dto.nameEn !== undefined) title.nameEn = dto.nameEn;
    if (dto.rank !== undefined) title.rank = dto.rank;
    if (dto.staffLevel !== undefined) title.staffLevel = dto.staffLevel;
    return this.titleRepo.save(title);
  }

  /**
   * Soft-deactivate: the title vanishes from the pickers but existing employees /
   * postings keep their `title_id` and still rank correctly (the chart loads all
   * titles), so this never breaks the chart.
   */
  async deactivate(id: string): Promise<Title> {
    const title = await this.findOne(id);
    title.active = false;
    return this.titleRepo.save(title);
  }

  /** A readable, unique id from the (English) name, with a random suffix on collision. */
  private async generateId(base: string): Promise<string> {
    const slug = slugify(base) || randomBytes(4).toString('hex');
    const exists = await this.titleRepo.findOne({ where: { id: slug } });
    return exists ? `${slug}-${randomBytes(2).toString('hex')}` : slug;
  }
}
