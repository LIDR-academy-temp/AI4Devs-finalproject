import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MatchMethod, MatchStatus, TransactionStatus } from '../../generated/prisma/client.js';
import { ISO_DATE } from '../../reconciliations/dto/create-reconciliation.dto.js';
import { MAX_PAGE_SIZE } from '../../reconciliations/dto/list-reconciliations.query.js';

export const MAX_NOTE_LENGTH = 500;
export const MAX_MANUAL_ITEMS = 500;

class PageQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = 50;
}

export class TransactionsQuery extends PageQuery {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'dateFrom debe tener formato YYYY-MM-DD' })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'dateTo debe tener formato YYYY-MM-DD' })
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMax?: number;

  @ApiPropertyOptional({ description: 'Marca de tarjeta (solo ventas POS)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string;
}

export class MatchesQuery extends PageQuery {
  @ApiPropertyOptional({ enum: MatchMethod })
  @IsOptional()
  @IsEnum(MatchMethod)
  method?: MatchMethod;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class CreateManualMatchDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos una venta' })
  @ArrayMaxSize(MAX_MANUAL_ITEMS)
  @IsUUID('all', { each: true })
  posIds!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un movimiento' })
  @ArrayMaxSize(MAX_MANUAL_ITEMS)
  @IsUUID('all', { each: true })
  bankIds!: string[];

  @ApiPropertyOptional({ maxLength: MAX_NOTE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH, { message: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres` })
  note?: string;
}

export class DecideMatchDto {
  @ApiPropertyOptional({ enum: ['CONFIRM', 'REJECT'] })
  @IsIn(['CONFIRM', 'REJECT'])
  action!: 'CONFIRM' | 'REJECT';

  @ApiPropertyOptional({ maxLength: MAX_NOTE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH, { message: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres` })
  note?: string;
}
