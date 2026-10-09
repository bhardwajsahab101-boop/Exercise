import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Enable CORS for frontend requests
  const allowedOrigins = [
    'https://exercise.launchstack.in',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];

  const envFrontend = process.env.FRONTEND_URL;
  if (envFrontend) {
    const trimmed = envFrontend.replace(/\/$/, '');
    if (!allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  }

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile in-app browsers)
      if (!requestOrigin) return callback(null, true);

      const normalized = requestOrigin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.some((allowed) => allowed.replace(/\/$/, '') === normalized);

      if (isAllowed) {
        return callback(null, true);
      }
      logger.warn(`CORS request rejected from origin: ${requestOrigin}`);
      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });


  // Enable global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Stride Exercise Tracking API')
    .setDescription('NestJS Backend REST API for Stride - Supabase Authenticated Workout Tracker')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`NestJS server running on http://localhost:${port}/api`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
