import { describe, it, expect, beforeEach } from 'vitest';
import { ShareService } from './share.service.js';
import { ConfigService } from '@nestjs/config';

describe('ShareService', () => {
  let shareService: ShareService;
  let mockSupabaseService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockSupabaseService = {
      getClient: () => null, // Test in-memory fallback & core computation logic
    };

    mockConfigService = {
      get: (key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return null;
      },
    };

    shareService = new ShareService(mockSupabaseService, mockConfigService as ConfigService);
  });

  describe('token generation & hashing', () => {
    it('should generate a 64-character hex token and valid shareUrl', async () => {
      const res = await shareService.generateShareToken('user-123');
      expect(res.token).toHaveLength(64);
      expect(res.shareUrl).toBe(`http://localhost:5173/share/${res.token}`);
      expect(res.createdAt).toBeDefined();
    });

    it('should compute consistent SHA-256 hash', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const hash1 = shareService.hashToken(token);
      const hash2 = shareService.hashToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });
  });

  describe('getSharedProgress security & calculation', () => {
    it('should reject invalid or short tokens with NotFoundException', async () => {
      await expect(shareService.getSharedProgress('short')).rejects.toThrow();
      await expect(shareService.getSharedProgress('')).rejects.toThrow();
    });

    it('should calculate analytics and strictly sanitize workout fields without notes or user_id', async () => {
      // Mock Supabase RPC returning sample workouts
      const sampleWorkouts = [
        {
          id: 'w-1',
          user_id: 'secret-owner-id',
          notes: 'Private doctor consultation notes that must not leak',
          type: 'run',
          date: '2026-10-09',
          distance_km: 7.5,
          duration_minutes: 36,
          sets: null,
          reps_per_set: null,
          total_reps: null,
          created_at: '2026-10-09T00:00:00Z',
        },
        {
          id: 'w-2',
          user_id: 'secret-owner-id',
          notes: 'Felt tired today - private note',
          type: 'run',
          date: '2026-10-02',
          distance_km: 5.0,
          duration_minutes: 25,
          sets: null,
          reps_per_set: null,
          total_reps: null,
          created_at: '2026-10-02T00:00:00Z',
        },
        {
          id: 'w-3',
          user_id: 'secret-owner-id',
          notes: 'Form was shaky',
          type: 'pushups',
          date: '2026-10-08',
          distance_km: null,
          duration_minutes: 15,
          sets: 4,
          reps_per_set: 25,
          total_reps: 100,
          created_at: '2026-10-08T00:00:00Z',
        },
      ];

      const rpcMockClient = {
        rpc: (fnName: string) => {
          if (fnName === 'get_shared_workouts_by_token') {
            return Promise.resolve({ data: sampleWorkouts, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };

      const customSupabaseService = {
        getClient: () => rpcMockClient,
      };

      const service = new ShareService(customSupabaseService as any, mockConfigService as any);
      const validToken = '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';

      const payload = await service.getSharedProgress(validToken);

      expect(payload.valid).toBe(true);

      // Verify privacy and sanitization: notes, user_id, created_at must NOT exist
      payload.all_workouts.forEach((item: any) => {
        expect(item.notes).toBeUndefined();
        expect(item.user_id).toBeUndefined();
        expect(item.created_at).toBeUndefined();
        expect(item.id).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.date).toBeDefined();
      });

      // Verify summary
      expect(payload.summary.total_workouts).toBe(3);
      expect(payload.summary.total_distance_km).toBe(12.5);
      expect(payload.summary.total_runs).toBe(2);
      expect(payload.summary.total_strength_reps).toBe(100);

      // Verify personal bests
      expect(payload.personal_bests.longest_run_km).toBe(7.5);
      expect(payload.personal_bests.fastest_pace_min_km).toBe('4:48'); // 36 / 7.5 = 4.8 min/km = 4:48
      expect(payload.personal_bests.max_pushups_reps).toBe(100);

      // Verify comparisons exist
      expect(payload.comparisons.week_distance_km).toBeDefined();
      expect(payload.comparisons.month_distance_km).toBeDefined();

      // Verify trends
      expect(payload.weekly_trends.length).toBeGreaterThan(0);
      expect(payload.monthly_trends.length).toBeGreaterThan(0);
    });
  });

  describe('revokeShareToken', () => {
    it('should revoke active tokens', async () => {
      const res = await shareService.generateShareToken('user-1');
      const statusBefore = await shareService.getShareStatus('user-1');
      expect(statusBefore.hasActiveShare).toBe(true);

      const revokeRes = await shareService.revokeShareToken('user-1');
      expect(revokeRes.success).toBe(true);

      const statusAfter = await shareService.getShareStatus('user-1');
      expect(statusAfter.hasActiveShare).toBe(false);
    });
  });
});
