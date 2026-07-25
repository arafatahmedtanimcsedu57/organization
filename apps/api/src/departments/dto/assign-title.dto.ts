import { IsNotEmpty, IsString } from 'class-validator';

/** Body for `POST /departments/:id/titles` - the title to make usable in the department. */
export class AssignTitleDto {
  @IsString()
  @IsNotEmpty()
  titleId!: string;
}
