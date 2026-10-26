import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  CreateManualMatchDto,
  DecideMatchDto,
  MatchesQuery,
  TransactionsQuery,
} from './dto/results.dto.js';
import { MatchesService } from './matches.service.js';
import { ResultsService } from './results.service.js';

@ApiTags('results')
@ApiBearerAuth()
@Controller()
export class ResultsController {
  constructor(
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(MatchesService) private readonly matches: MatchesService,
  ) {}

  @Get('reconciliations/:id/summary')
  @ApiOperation({ summary: 'Indicadores actuales de la conciliación' })
  summary(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.results.summary(user.companyId, id);
  }

  @Get('reconciliations/:id/pos-transactions')
  @ApiOperation({ summary: 'Ventas POS (filtros y paginación)' })
  listPos(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TransactionsQuery,
  ) {
    return this.results.listPos(user.companyId, id, query);
  }

  @Get('reconciliations/:id/bank-movements')
  @ApiOperation({ summary: 'Movimientos bancarios (filtros y paginación)' })
  listBank(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TransactionsQuery,
  ) {
    return this.results.listBank(user.companyId, id, query);
  }

  @Get('reconciliations/:id/matches')
  @ApiOperation({ summary: 'Cruces con sus transacciones (filtros y paginación)' })
  listMatches(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MatchesQuery,
  ) {
    return this.results.listMatches(user.companyId, id, query);
  }

  @Post('reconciliations/:id/matches')
  @ApiOperation({ summary: 'Crea un cruce manual confirmado' })
  createManual(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateManualMatchDto,
  ) {
    return this.matches.createManual(user.companyId, user.userId, id, dto);
  }

  @Patch('matches/:matchId')
  @ApiOperation({ summary: 'Confirma o rechaza un cruce propuesto' })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: DecideMatchDto,
  ) {
    return this.matches.decide(user.companyId, user.userId, matchId, dto);
  }

  @Delete('matches/:matchId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deshace un cruce y devuelve sus transacciones a pendiente' })
  async undo(@CurrentUser() user: AuthUser, @Param('matchId', ParseUUIDPipe) matchId: string) {
    await this.matches.undo(user.companyId, user.userId, matchId);
  }
}
