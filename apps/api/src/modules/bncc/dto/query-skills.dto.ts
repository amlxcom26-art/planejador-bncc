import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySkillsDto {
  @IsOptional()
  @IsString()
  nivel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  ano?: number;

  @IsOptional()
  @IsString()
  eixo?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
