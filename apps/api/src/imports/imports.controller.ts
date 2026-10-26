import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ImportFileDto, PreviewQuery } from './dto/import-file.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FileTooLargeFilter } from './file-too-large.filter.js';
import { ImportsService, MAX_FILE_SIZE, type UploadedBuffer } from './imports.service.js';

@ApiTags('imports')
@ApiBearerAuth()
@Controller()
export class ImportsController {
  constructor(@Inject(ImportsService) private readonly service: ImportsService) {}

  @Post('reconciliations/:id/files')
  @ApiOperation({ summary: 'Sube un archivo POS o bancario (.csv/.xlsx, máx. 10 MB)' })
  @ApiConsumes('multipart/form-data')
  @UseFilters(FileTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: UploadedBuffer | undefined,
  ) {
    return this.service.upload(user.companyId, id, dto.sourceType, file);
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Estado de un archivo y errores de su última importación' })
  getFile(@CurrentUser() user: AuthUser, @Param('fileId', ParseUUIDPipe) fileId: string) {
    return this.service.getFile(user.companyId, fileId);
  }

  @Get('files/:fileId/preview')
  @ApiOperation({ summary: 'Cabeceras, 20 filas de muestra y campos estándar disponibles' })
  preview(
    @CurrentUser() user: AuthUser,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query() query: PreviewQuery,
  ) {
    return this.service.preview(user.companyId, fileId, query.headerRow);
  }

  @Post('files/:fileId/import')
  @HttpCode(200)
  @ApiOperation({ summary: 'Aplica el mapeo de columnas e importa las filas del archivo' })
  import(
    @CurrentUser() user: AuthUser,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: ImportFileDto,
  ) {
    return this.service.import(user.companyId, fileId, dto);
  }
}
