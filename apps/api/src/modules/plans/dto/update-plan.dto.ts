import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString({ message: 'O título deve ser uma string.' })
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres.' })
  @MaxLength(120, { message: 'O título não pode exceder 120 caracteres.' })
  title?: string;

  @IsString({ message: 'O conteúdo em Markdown deve ser uma string.' })
  @IsNotEmpty({ message: 'O conteúdo do plano de aula não pode ser vazio.' })
  @MinLength(10, { message: 'O conteúdo em Markdown deve conter pelo menos 10 caracteres.' })
  contentMarkdown: string;
}
