import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });

  const configService = app.get(ConfigService);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 2. Cấu hình Swagger (Tài liệu API)
  // const config = new DocumentBuilder()
  //   .setTitle('E-commerce API')
  //   .setDescription('The e-commerce platform API description')
  //   .setVersion('1.0')
  //   .addBearerAuth() // Cho phép xác thực bằng Bearer Token trong Swagger UI
  //   .build();
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api', app, document);

  // 3. Cấu hình Global Prefix cho tất cả các endpoint API
  app.setGlobalPrefix('api/v1', { exclude: [''] }); // Các endpoint không có prefix sẽ không bị ảnh hưởng

  // 4. Cấu hình CORS (Cross-Origin Resource Sharing)
  // Chỉ gọi enableCors một lần với cấu hình chi tiết
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL'), // Cho phép client frontend truy cập
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Các HTTP methods được phép
    preflightContinue: false,
    credentials: true, // Cho phép gửi cookie và header Authorization
    allowedHeaders: 'Content-Type, Accept, Authorization', // Các header được phép
  });

  // 5. Sử dụng Cookie Parser Middleware
  app.use(cookieParser());



  // 7. Cấu hình Global Interceptors

  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = configService.get('PORT') || 8080;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}


bootstrap();