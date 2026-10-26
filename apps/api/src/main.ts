import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { API_PREFIX, configureApp } from './app.setup.js';
import type { Env } from './config/env.schema.js';

export const DOCS_PATH = 'api/docs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('Bootstrap');

  configureApp(app);
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Concilia API')
    .setDescription('Conciliación automática de ventas con tarjeta (POS) contra extracto bancario')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(DOCS_PATH, app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`API escuchando en http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Documentación OpenAPI en http://localhost:${port}/${DOCS_PATH}`);
}

try {
  await bootstrap();
} catch (error: unknown) {
  // Un fallo de validación de entorno llega aquí con el nombre de la variable ausente
  const message = error instanceof Error ? error.message : String(error);
  new Logger('Bootstrap').error(`La API no pudo iniciar: ${message}`);
  process.exit(1);
}
