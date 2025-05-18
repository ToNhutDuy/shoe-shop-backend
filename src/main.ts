import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({
    stopAtFirstError: true,
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true
  }));
  const port = configService.get('PORT');

  app.setGlobalPrefix('api/v1', { exclude: [''] });

  //config cores
  app.enableCors(
    {
      "origin": true,
      "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "preflightContinue": false,
      credentials: true
    }
  );



  await app.listen(port);

}
bootstrap();
