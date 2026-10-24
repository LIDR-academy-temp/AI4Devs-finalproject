import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto.js';
import { ListReconciliationsQuery } from './dto/list-reconciliations.query.js';
import { ReconciliationsService } from './reconciliations.service.js';

@ApiTags('reconciliations')
@ApiBearerAuth()
@Controller('reconciliations')
export class ReconciliationsController {
  constructor(@Inject(ReconciliationsService) private readonly service: ReconciliationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista conciliaciones (paginado, filtros por estado y período)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListReconciliationsQuery) {
    return this.service.list(user.companyId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una conciliación en estado DRAFT' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReconciliationDto) {
    return this.service.create(user.companyId, user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una conciliación con parámetros, archivos y estadísticas' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.companyId, id);
  }
}
