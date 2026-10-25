import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { MatchesService } from './matches.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { ReconciliationRunner } from './reconciliation-runner.js';
import { ResultsController } from './results.controller.js';
import { ResultsService } from './results.service.js';
import { StoreMappingsController } from './store-mappings/store-mappings.controller.js';
import { StoreMappingsService } from './store-mappings/store-mappings.service.js';

@Module({
  controllers: [MatchingController, StoreMappingsController, ResultsController],
  providers: [
    MatchingService,
    ReconciliationRunner,
    StoreMappingsService,
    ResultsService,
    MatchesService,
    AuditService,
  ],
})
export class MatchingModule {}
