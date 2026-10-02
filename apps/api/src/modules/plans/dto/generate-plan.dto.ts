import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class GeneratePlanDto {
  @IsArray({ message: 'skillIds deve ser uma lista de identificadores de habilidades.' })
  @ArrayMinSize(1, { message: 'Selecione pelo menos uma habilidade da BNCC.' })
  @ArrayMaxSize(5, { message: 'Você pode selecionar no máximo 5 habilidades da BNCC.' })
  @IsString({ each: true, message: 'Cada identificador de habilidade deve ser uma string.' })
  @IsNotEmpty({ each: true, message: 'O identificador da habilidade não pode ser vazio.' })
  skillIds: string[];

  @IsOptional()
  @IsString({ message: 'O título deve ser uma string.' })
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres.' })
  @MaxLength(120, { message: 'O título não pode exceder 120 caracteres.' })
  title?: string;

  @IsInt({ message: 'A duração da aula deve ser um número inteiro.' })
  @Min(15, { message: 'A duração mínima permitida é de 15 minutos.' })
  @Max(360, { message: 'A duração máxima permitida é de 360 minutos.' })
  duration: number;

  @IsBoolean({ message: 'O uso de recursos digitais deve ser verdadeiro ou falso.' })
  digitalResources: boolean;

  @IsString({ message: 'A instrução pedagógica deve ser uma string.' })
  @IsNotEmpty({ message: 'A instrução pedagógica é obrigatória.' })
  @MinLength(10, { message: 'A instrução pedagógica deve conter pelo menos 10 caracteres.' })
  @MaxLength(1000, { message: 'A instrução pedagógica não pode exceder 1.000 caracteres.' })
  pedagogicalInstruction: string;
}
