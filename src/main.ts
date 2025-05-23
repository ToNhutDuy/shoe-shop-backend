import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
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

  // Dùng Interceptor để wrap response thành ApiResponse.ok
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // Dùng ExceptionFilter để wrap lỗi thành ApiResponse.error
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);

}
bootstrap();
