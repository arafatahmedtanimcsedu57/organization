import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** All fields optional - a maintainer may rename, relabel, re-rank, or reclassify a title. */
export class UpdateTitleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsInt()
  rank?: number;

  @IsOptional()
  @IsBoolean()
  staffLevel?: boolean;
}
