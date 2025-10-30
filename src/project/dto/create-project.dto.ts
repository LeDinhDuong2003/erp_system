import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  project_key: string;

  @IsString()
  @IsNotEmpty()
  project_name: string;
}