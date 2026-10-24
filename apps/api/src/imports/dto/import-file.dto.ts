import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class ImportFileDto {
  @ApiProperty({
    description: 'Índice de columna (base 0) → campo estándar',
    example: { '0': 'transactionAt', '12': 'amount' },
  })
  @IsObject()
  columnMapping!: Record<string, string>;

  @ApiProperty({ example: 'dd/MM/yyyy' })
  @IsString()
  dateFormat!: string;

  @ApiProperty({ enum: ['.', ','] })
  @IsIn(['.', ','])
  decimalSeparator!: '.' | ',';

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Fila de cabeceras (1 = primera)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  headerRow: number = 1;
}

export class PreviewQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  headerRow: number = 1;
}
