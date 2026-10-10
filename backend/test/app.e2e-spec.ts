import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { SupabaseService } from './../src/supabase/supabase.service.js';

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

  describe('Authenticated Scoped Workouts & Sync', () => {
    let authApp: INestApplication<App>;
    const mockUser1 = { id: 'user-uuid-001', email: 'runner1@stride.local' };
    const mockUser2 = { id: 'user-uuid-002', email: 'runner2@stride.local' };

    beforeEach(async () => {
      const mockSupabaseService = {
        verifyToken: async (token: string) => {
          if (token === 'valid-token-user-1') return mockUser1;
          if (token === 'valid-token-user-2') return mockUser2;
          return null;
        },
        getClient: () => null, // Falls back to in-memory store for isolated unit/e2e testing
      };

      const fixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(SupabaseService)
        .useValue(mockSupabaseService)
        .compile();

      authApp = fixture.createNestApplication();
      authApp.setGlobalPrefix('api');
      await authApp.init();
    });

    it('creates workout scoped to authenticated user ID', async () => {
      const res = await request(authApp.getHttpServer())
        .post('/api/workouts')
        .set('Authorization', 'Bearer valid-token-user-1')
        .send({
          type: 'run',
          date: '2026-10-10',
          distance_km: 8.5,
          duration_minutes: 42,
          notes: 'Morning trail run',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.user_id).toBe(mockUser1.id);
      expect(res.body.distance_km).toBe(8.5);
    });

    it('scopes workout listing strictly to the calling user', async () => {
      // User 1 creates a workout
      await request(authApp.getHttpServer())
        .post('/api/workouts')
        .set('Authorization', 'Bearer valid-token-user-1')
        .send({ type: 'pushups', date: '2026-10-10', sets: 4, reps_per_set: 25 })
        .expect(201);

      // User 1 sees their workout
      const res1 = await request(authApp.getHttpServer())
        .get('/api/workouts')
        .set('Authorization', 'Bearer valid-token-user-1')
        .expect(200);

      expect(res1.body.length).toBeGreaterThanOrEqual(1);
      expect(res1.body.every((w: any) => w.user_id === mockUser1.id)).toBe(true);

      // User 2 sees 0 workouts (isolated)
      const res2 = await request(authApp.getHttpServer())
        .get('/api/workouts')
        .set('Authorization', 'Bearer valid-token-user-2')
        .expect(200);

      expect(res2.body.length).toBe(0);
    });

    it('batch syncs multiple offline workouts for the authenticated user', async () => {
      const offlineWorkouts = [
        { type: 'run', date: '2026-10-08', distance_km: 5.0, duration_minutes: 25 },
        { type: 'squats', date: '2026-10-09', sets: 3, reps_per_set: 20 },
      ];

      const res = await request(authApp.getHttpServer())
        .post('/api/workouts/sync')
        .set('Authorization', 'Bearer valid-token-user-1')
        .send({ workouts: offlineWorkouts })
        .expect(201);

      expect(res.body).toEqual({ syncedCount: 2 });

      // Verify they are now in User 1's list
      const listRes = await request(authApp.getHttpServer())
        .get('/api/workouts')
        .set('Authorization', 'Bearer valid-token-user-1')
        .expect(200);

      expect(listRes.body.length).toBeGreaterThanOrEqual(2);
    });

    afterEach(async () => {
      await authApp.close();
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
