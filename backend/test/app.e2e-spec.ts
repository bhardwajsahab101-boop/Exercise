import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Stride API & Security (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET Hello World)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  describe('Security & Owner-Only Enforcement', () => {
    it('/api/workouts (GET without token) -> 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/workouts')
        .expect(401);
    });

    it('/api/workouts (POST without token) -> 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .post('/api/workouts')
        .send({ type: 'run', date: '2026-10-09', distance_km: 5 })
        .expect(401);
    });

    it('/api/share/status (GET without token) -> 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/share/status')
        .expect(401);
    });

    it('/api/share/generate (POST without token) -> 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .post('/api/share/generate')
        .expect(401);
    });

    it('/api/share/revoke (POST without token) -> 401 Unauthorized', () => {
      return request(app.getHttpServer())
        .post('/api/share/revoke')
        .expect(401);
    });
  });

  describe('Read-Only Family Sharing Endpoint', () => {
    it('/api/share/:token (GET with invalid token) -> 404 Not Found', () => {
      return request(app.getHttpServer())
        .get('/api/share/invalid-nonexistent-token')
        .expect(404);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
