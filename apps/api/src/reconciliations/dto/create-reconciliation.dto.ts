import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ReconciliationConfigDto } from './reconciliation-config.dto.js';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReconciliationDto {
  @ApiProperty({ example: 'Diners agosto 2026' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'name no puede estar vacío' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '2026-08-01', description: 'Fecha de inicio (YYYY-MM-DD)' })
  @Matches(ISO_DATE, { message: 'periodStart debe tener formato YYYY-MM-DD' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-31', description: 'Fecha de fin (YYYY-MM-DD)' })
  @Matches(ISO_DATE, { message: 'periodEnd debe tener formato YYYY-MM-DD' })
  periodEnd!: string;

  @ApiPropertyOptional({ type: ReconciliationConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReconciliationConfigDto)
  config?: ReconciliationConfigDto;
}
