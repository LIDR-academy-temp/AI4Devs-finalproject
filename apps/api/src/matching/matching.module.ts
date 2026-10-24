import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { ReconciliationRunner } from './reconciliation-runner.js';
import { StoreMappingsController } from './store-mappings/store-mappings.controller.js';
import { StoreMappingsService } from './store-mappings/store-mappings.service.js';

@Module({
  controllers: [MatchingController, StoreMappingsController],
  providers: [MatchingService, ReconciliationRunner, StoreMappingsService],
})
export class MatchingModule {}
