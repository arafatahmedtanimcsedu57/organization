import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Create a managed title. `id` is derived from the name; `rank` orders the roster. */
export class CreateTitleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsInt()
  rank!: number;

  @IsOptional()
  @IsBoolean()
  staffLevel?: boolean;
}
