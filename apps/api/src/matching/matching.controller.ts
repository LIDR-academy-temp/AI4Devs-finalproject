import { Body, Controller, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { MatchingService } from './matching.service.js';
import { RunReconciliationDto } from './run.dto.js';

@ApiTags('matching')
@ApiBearerAuth()
@Controller('reconciliations')
export class MatchingController {
  constructor(@Inject(MatchingService) private readonly service: MatchingService) {}

  @Post(':id/run')
  @HttpCode(202)
  @ApiOperation({ summary: 'Ejecuta el motor de conciliación (asíncrono: consultar el estado)' })
  run(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RunReconciliationDto,
  ) {
    return this.service.start(user.companyId, user.userId, id, dto);
  }
}
