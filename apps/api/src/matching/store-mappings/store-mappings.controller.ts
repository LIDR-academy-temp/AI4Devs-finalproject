import {
  Controller,
  Get,
  Inject,
  Put,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { FileTooLargeFilter } from '../../imports/file-too-large.filter.js';
import { MAX_FILE_SIZE } from '../../imports/imports.service.js';
import { StoreMappingsService } from './store-mappings.service.js';

@ApiTags('store-mappings')
@ApiBearerAuth()
@Controller('store-mappings')
export class StoreMappingsController {
  constructor(@Inject(StoreMappingsService) private readonly service: StoreMappingsService) {}

  @Get()
  @ApiOperation({ summary: 'Relación de locales POS ↔ código de establecimiento del banco' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.companyId);
  }

  @Put()
  @ApiOperation({
    summary: 'Reemplaza la relación de locales con un archivo .xlsx/.csv de dos columnas',
  })
  @ApiConsumes('multipart/form-data')
  @UseFilters(FileTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    }),
  )
  replace(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    return this.service.replaceFromFile(user.companyId, file);
  }
}
