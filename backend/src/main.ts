import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { SerializeInterceptor } from './common/serialize';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import type { ServerResponse } from 'node:http';
import { hostWeb } from './common/web-host';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
    )
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  hostWeb(app);
  app.useStaticAssets(resolve(process.cwd(), 'public', 'products'), {
    prefix: '/media/products/',
    index: false,
    maxAge: '1d',
    setHeaders: (response: ServerResponse) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });
  app.useGlobalInterceptors(new SerializeInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  console.log(`Backend listening on http://${host}:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Startup failed');
  process.exitCode = 1;
});
