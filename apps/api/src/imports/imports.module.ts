import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';
import { FILE_STORAGE, LocalFileStorage } from './file-storage.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({
  controllers: [ImportsController],
  providers: [
    ImportsService,
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new LocalFileStorage(config.get('STORAGE_DIR', { infer: true })),
    },
  ],
})
export class ImportsModule {}
