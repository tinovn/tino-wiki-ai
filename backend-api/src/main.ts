import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Attach Redis Socket.IO adapter for horizontal scaling
  const { RedisIoAdapter } = await import('./core/websocket/redis-io.adapter');
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(app);
  app.useWebSocketAdapter(redisIoAdapter);

  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS (supports wildcard subdomains like https://*.ai.tino.vn)
  const corsOrigins = configService.get<string>('app.corsOrigins', '');
  const origins: (string | RegExp)[] = corsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) =>
      o.includes('*')
        ? new RegExp('^' + o.replace(/\./g, '\\.').replace('*', '[^.]+') + '$')
        : o,
    );
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  if (configService.get<string>('app.env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tino Wiki CRM')
      .setDescription('SaaS AI Knowledge System API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
      .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
  console.log(`🚀 Tino Wiki CRM running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
