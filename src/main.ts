import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://avtolider.kz',
      'https://www.avtolider.kz',
      'http://91.243.71.238:3000',
      'https://91.243.71.238:3000',
    ],
    credentials: true,
  });

  await app.listen(port);
}
bootstrap();
