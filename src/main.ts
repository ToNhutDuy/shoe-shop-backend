import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import * as express from 'express'; // Chỉ cần thiết nếu bạn phục vụ file tĩnh CÙNG VỚI NestJS (không dùng ServeStaticModule)
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Chỉ ghi nhận lỗi và cảnh báo để console gọn gàng hơn trong quá trình phát triển
    logger: ['error', 'warn'],
  });

  const configService = app.get(ConfigService);

  // 1. Phục vụ file tĩnh (ảnh, video, v.v.) từ thư mục 'uploads'
  // Lưu ý: Nếu bạn đã cấu hình ServeStaticModule trong MediaModule, bạn có thể bỏ dòng này
  // Tuy nhiên, việc để ở đây cũng không gây hại và đảm bảo phục vụ được file.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // 2. Cấu hình Swagger (Tài liệu API)
  const config = new DocumentBuilder()
    .setTitle('E-commerce API')
    .setDescription('The e-commerce platform API description')
    .setVersion('1.0')
    .addBearerAuth() // Cho phép xác thực bằng Bearer Token trong Swagger UI
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

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

  // 6. Cấu hình Global Pipes
  // - ValidationPipe: Tự động validate DTOs, chuyển đổi kiểu và loại bỏ các trường không mong muốn
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Tự động chuyển đổi payload thành instance của DTO
      whitelist: true, // Loại bỏ các trường không được định nghĩa trong DTO
      forbidNonWhitelisted: true, // Ném lỗi nếu có trường không được phép
    }),
  );

  // 7. Cấu hình Global Interceptors
  // - TransformInterceptor: Chuẩn hóa định dạng phản hồi API thành ApiResponse.ok
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // 8. Cấu hình Global Exception Filters
  // - AllExceptionsFilter: Bắt và chuẩn hóa các lỗi thành ApiResponse.error
  app.useGlobalFilters(new AllExceptionsFilter());

  // Lắng nghe các yêu cầu trên cổng đã cấu hình hoặc mặc định 8080
  const port = configService.get('PORT') || 8080;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

// Khởi động ứng dụng
bootstrap();