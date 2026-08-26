import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { SerializeInterceptor } from './common/serialize';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalInterceptors(
    new SerializeInterceptor(),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Backend listening on http://0.0.0.0:${port}`);
}

bootstrap();
