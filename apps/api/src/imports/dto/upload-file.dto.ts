import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SourceType } from '../../generated/prisma/client.js';

export class UploadFileDto {
  @ApiProperty({ enum: SourceType, description: 'Origen del archivo: POS o BANK' })
  @IsEnum(SourceType)
  sourceType!: SourceType;
}
