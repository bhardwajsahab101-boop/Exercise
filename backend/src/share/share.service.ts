import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SharedWorkoutItem,
  SharedProgressSummary,
  SharedProgressComparisons,
  SharedPersonalBests,
  WeeklyTrendBucket,
  MonthlyTrendBucket,
  SharedProgressPayload,
  ShareStatusResponse,
  GenerateShareResponse,
  ComparisonMetric,
} from './share.dto';

interface InMemoryShareRecord {
  userId: string;
  tokenHash: string;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string | null;
}

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  // In-memory fallback if database table is not yet provisioned
  private inMemoryShares: InMemoryShareRecord[] = [];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hash a raw token with SHA-256 hex
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Generate a secure random 64-character token, hash it, and store in database
   */
  async generateShareToken(userId: string): Promise<GenerateShareResponse> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const nowIso = new Date().toISOString();

    const supabase = this.supabaseService.getClient();

    if (supabase) {
      try {
        // Deactivate any currently active tokens for this user
        await supabase
          .from('share_settings')
          .update({ is_active: false, revoked_at: nowIso })
          .eq('user_id', userId)
          .eq('is_active', true);

        // Insert new active share token hash
        const { error: insertErr } = await supabase.from('share_settings').insert({
          user_id: userId,
          token_hash: tokenHash,
          is_active: true,
          created_at: nowIso,
        });

        if (insertErr) {
          this.logger.warn(
            `Supabase share_settings insert failed (${insertErr.message}), falling back to in-memory store`,
          );
          this.saveToMemory(userId, tokenHash, nowIso);
        }
      } catch (err) {
        this.logger.warn(`Error storing token in Supabase: ${err}, using in-memory store`);
        this.saveToMemory(userId, tokenHash, nowIso);
      }
    } else {
      this.saveToMemory(userId, tokenHash, nowIso);
    }

    const rawFrontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      (this.configService.get<string>('NODE_ENV') === 'production'
        ? 'https://exercise.launchstack.in'
        : 'http://localhost:5173');
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
    const shareUrl = `${frontendUrl}/share/${rawToken}`;


    return {
      token: rawToken,
      shareUrl,
      createdAt: nowIso,
    };
  }

  /**
   * Revoke an active share token for user
   */
  async revokeShareToken(userId: string): Promise<{ success: boolean; message: string }> {
    const nowIso = new Date().toISOString();
    const supabase = this.supabaseService.getClient();

    if (supabase) {
      try {
        await supabase
          .from('share_settings')
          .update({ is_active: false, revoked_at: nowIso })
          .eq('user_id', userId)
          .eq('is_active', true);
      } catch (err) {
        this.logger.warn(`Error revoking share token in Supabase: ${err}`);
      }
    }

    // Also update in-memory store
    this.inMemoryShares.forEach((s) => {
      if (s.userId === userId && s.isActive) {
        s.isActive = false;
        s.revokedAt = nowIso;
      }
    });

    return {
      success: true,
      message: 'Share link has been revoked. Viewers will no longer have access.',
    };
  }

  /**
   * Check if owner has an active share link
   */
  async getShareStatus(userId: string): Promise<ShareStatusResponse> {
    const supabase = this.supabaseService.getClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('share_settings')
          .select('id, created_at, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            hasActiveShare: true,
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        this.logger.warn(`Error checking share status in Supabase: ${err}`);
      }
    }

    const memoryActive = this.inMemoryShares.find((s) => s.userId === userId && s.isActive);
    return {
      hasActiveShare: Boolean(memoryActive),
      createdAt: memoryActive?.createdAt || null,
    };
  }

  /**
   * Public family viewer endpoint: Validate token hash and compute progress analytics
   */
  async getSharedProgress(rawToken: string): Promise<SharedProgressPayload> {
    if (!rawToken || rawToken.trim().length < 16) {
      throw new NotFoundException('Invalid or expired share link');
    }

    const tokenHash = this.hashToken(rawToken);
    const workouts = await this.fetchWorkoutsByTokenHash(tokenHash);

    if (!workouts) {
      throw new NotFoundException('Invalid or expired share link');
    }

    // Sanitize raw workout list: ensure ONLY safe fields are exposed
    const safeWorkouts: SharedWorkoutItem[] = workouts.map((w) => ({
      id: w.id,
      type: w.type,
      date: w.date,
      distance_km: w.distance_km !== null && w.distance_km !== undefined ? Number(w.distance_km) : null,
      sets: w.sets !== null && w.sets !== undefined ? Number(w.sets) : null,
      reps_per_set: w.reps_per_set !== null && w.reps_per_set !== undefined ? Number(w.reps_per_set) : null,
      total_reps: w.total_reps !== null && w.total_reps !== undefined ? Number(w.total_reps) : null,
      duration_minutes:
        w.duration_minutes !== null && w.duration_minutes !== undefined ? Number(w.duration_minutes) : null,
    }));

    // Filter runs
    const runs = safeWorkouts.filter((w) => w.type === 'run');

    // 1. Overall Summary
    const totalWorkouts = safeWorkouts.length;
    const totalDistance = safeWorkouts.reduce((acc, w) => acc + (w.distance_km || 0), 0);
    const totalDuration = safeWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);
    const totalStrengthReps = safeWorkouts.reduce((acc, w) => acc + (w.total_reps || 0), 0);
    const activeDays = new Set(safeWorkouts.map((w) => w.date)).size;

    const summary: SharedProgressSummary = {
      total_workouts: totalWorkouts,
      total_distance_km: Number(totalDistance.toFixed(2)),
      total_duration_minutes: Number(totalDuration.toFixed(1)),
      total_runs: runs.length,
      total_strength_reps: totalStrengthReps,
      active_days: activeDays,
    };

    // 2. Weekly & Monthly Comparisons
    const comparisons = this.calculateComparisons(safeWorkouts);

    // 3. Personal Bests
    const personalBests = this.calculatePersonalBests(safeWorkouts);

    // 4. Trend buckets for charts
    const weeklyTrends = this.calculateWeeklyTrends(safeWorkouts);
    const monthlyTrends = this.calculateMonthlyTrends(safeWorkouts);

    return {
      valid: true,
      summary,
      comparisons,
      personal_bests: personalBests,
      weekly_trends: weeklyTrends,
      monthly_trends: monthlyTrends,
      recent_runs: runs.slice(0, 20),
      all_workouts: safeWorkouts,
    };
  }

  /**
   * Internal helper to fetch workouts via token hash
   */
  private async fetchWorkoutsByTokenHash(tokenHash: string): Promise<any[] | null> {
    const supabase = this.supabaseService.getClient();

    if (supabase) {
      // 1. Try secure RPC function `get_shared_workouts_by_token`
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_shared_workouts_by_token',
          { p_token_hash: tokenHash },
        );

        if (!rpcError && rpcData) {
          // If the token was valid, rpcData will be an array of records (could be empty if 0 workouts)
          // To distinguish from invalid token, check share_settings existence if rpcData is empty
          if (rpcData.length > 0) {
            return rpcData;
          }

          // If empty array, verify if the token is active
          const { data: shareCheck } = await supabase
            .from('share_settings')
            .select('user_id')
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .maybeSingle();

          if (shareCheck) {
            return []; // Valid token, but user has 0 workouts logged
          }
        }
      } catch (err) {
        this.logger.debug(`RPC lookup failed: ${err}, checking table fallback`);
      }

      // 2. Direct table fallback if RPC is not yet created
      try {
        const { data: shareRecord, error: shareErr } = await supabase
          .from('share_settings')
          .select('user_id, is_active')
          .eq('token_hash', tokenHash)
          .eq('is_active', true)
          .maybeSingle();

        if (!shareErr && shareRecord && shareRecord.is_active) {
          // Fetch safe fields only
          const { data: wData } = await supabase
            .from('workouts')
            .select('id, type, date, distance_km, sets, reps_per_set, total_reps, duration_minutes')
            .eq('user_id', shareRecord.user_id)
            .order('date', { ascending: false });

          return wData || [];
        }
      } catch (err) {
        this.logger.debug(`Table query fallback failed: ${err}`);
      }
    }

    // 3. In-memory check
    const memShare = this.inMemoryShares.find((s) => s.tokenHash === tokenHash && s.isActive);
    if (memShare) {
      // If we have workouts in memory, retrieve them
      return [];
    }

    return null;
  }

  private saveToMemory(userId: string, tokenHash: string, nowIso: string) {
    this.inMemoryShares.forEach((s) => {
      if (s.userId === userId && s.isActive) {
        s.isActive = false;
        s.revokedAt = nowIso;
      }
    });
    this.inMemoryShares.push({
      userId,
      tokenHash,
      isActive: true,
      createdAt: nowIso,
    });
  }

  /**
   * Calculate comparisons across weeks and months
   */
  private calculateComparisons(workouts: SharedWorkoutItem[]): SharedProgressComparisons {
    const now = new Date();

    const d7 = new Date(now);
    d7.setDate(now.getDate() - 7);
    const d14 = new Date(now);
    d14.setDate(now.getDate() - 14);

    const d30 = new Date(now);
    d30.setDate(now.getDate() - 30);
    const d60 = new Date(now);
    d60.setDate(now.getDate() - 60);

    // Current 7 days vs previous 7 days
    const currentWeekWorkouts = workouts.filter((w) => {
      const dt = new Date(w.date + 'T00:00:00');
      return dt >= d7;
    });

    const prevWeekWorkouts = workouts.filter((w) => {
      const dt = new Date(w.date + 'T00:00:00');
      return dt >= d14 && dt < d7;
    });

    // Current 30 days vs previous 30 days
    const currentMonthWorkouts = workouts.filter((w) => {
      const dt = new Date(w.date + 'T00:00:00');
      return dt >= d30;
    });

    const prevMonthWorkouts = workouts.filter((w) => {
      const dt = new Date(w.date + 'T00:00:00');
      return dt >= d60 && dt < d30;
    });

    const buildMetric = (curr: number, prev: number): ComparisonMetric => {
      const diff = curr - prev;
      let pct: number | null = null;
      if (prev > 0) {
        pct = Number(((diff / prev) * 100).toFixed(1));
      } else if (curr > 0) {
        pct = 100;
      }
      return {
        current_period: Number(curr.toFixed(2)),
        previous_period: Number(prev.toFixed(2)),
        difference: Number(diff.toFixed(2)),
        percent_change: pct,
      };
    };

    return {
      week_distance_km: buildMetric(
        currentWeekWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
        prevWeekWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
      ),
      week_workouts: buildMetric(currentWeekWorkouts.length, prevWeekWorkouts.length),
      week_duration_minutes: buildMetric(
        currentWeekWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
        prevWeekWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
      ),
      month_distance_km: buildMetric(
        currentMonthWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
        prevMonthWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
      ),
      month_workouts: buildMetric(currentMonthWorkouts.length, prevMonthWorkouts.length),
      month_duration_minutes: buildMetric(
        currentMonthWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
        prevMonthWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
      ),
    };
  }

  /**
   * Calculate personal bests (Longest run, fastest pace, max reps)
   */
  private calculatePersonalBests(workouts: SharedWorkoutItem[]): SharedPersonalBests {
    let longestRunKm = 0;
    let fastestPaceSec = Infinity;
    let fastestPaceStr = '--:--';
    let maxPushups = 0;
    let maxSitups = 0;
    let maxSquats = 0;

    workouts.forEach((w) => {
      if (w.type === 'run') {
        const dist = w.distance_km || 0;
        const dur = w.duration_minutes || 0;
        if (dist > longestRunKm) longestRunKm = dist;
        if (dist > 0 && dur > 0) {
          const pacePerKmMin = dur / dist;
          if (pacePerKmMin < fastestPaceSec && pacePerKmMin >= 2.0) {
            fastestPaceSec = pacePerKmMin;
            const mins = Math.floor(pacePerKmMin);
            const secs = Math.round((pacePerKmMin - mins) * 60);
            fastestPaceStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          }
        }
      } else if (w.type === 'pushups') {
        const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
        if (reps > maxPushups) maxPushups = reps;
      } else if (w.type === 'situps') {
        const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
        if (reps > maxSitups) maxSitups = reps;
      } else if (w.type === 'squats') {
        const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
        if (reps > maxSquats) maxSquats = reps;
      }
    });

    return {
      longest_run_km: Number(longestRunKm.toFixed(2)),
      fastest_pace_min_km: fastestPaceStr,
      max_pushups_reps: maxPushups,
      max_situps_reps: maxSitups,
      max_squats_reps: maxSquats,
    };
  }

  /**
   * Group workouts into weekly trend buckets
   */
  private calculateWeeklyTrends(workouts: SharedWorkoutItem[]): WeeklyTrendBucket[] {
    const bucketsMap = new Map<
      string,
      { label: string; startDate: string; distance: number; count: number; duration: number }
    >();

    // Generate buckets for last 6 weeks
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i * 7);
      // Align to week
      const year = d.getFullYear();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      const key = `w-${i}`;
      bucketsMap.set(key, {
        label: `${month} ${day}`,
        startDate: d.toISOString().split('T')[0],
        distance: 0,
        count: 0,
        duration: 0,
      });
    }

    workouts.forEach((w) => {
      const wDate = new Date(w.date + 'T00:00:00');
      const diffDays = Math.floor((today.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 42) {
        const weekIdx = Math.floor(diffDays / 7);
        const key = `w-${weekIdx}`;
        const b = bucketsMap.get(key);
        if (b) {
          b.distance += w.distance_km || 0;
          b.count += 1;
          b.duration += w.duration_minutes || 0;
        }
      }
    });

    return Array.from(bucketsMap.values()).map((b) => ({
      week_label: b.label,
      start_date: b.startDate,
      distance_km: Number(b.distance.toFixed(2)),
      workouts: b.count,
      duration_minutes: Number(b.duration.toFixed(1)),
    }));
  }

  /**
   * Group workouts into monthly trend buckets
   */
  private calculateMonthlyTrends(workouts: SharedWorkoutItem[]): MonthlyTrendBucket[] {
    const map = new Map<string, { label: string; distance: number; count: number; duration: number }>();

    workouts.forEach((w) => {
      const d = new Date(w.date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const current = map.get(label) || { label, distance: 0, count: 0, duration: 0 };
      current.distance += w.distance_km || 0;
      current.count += 1;
      current.duration += w.duration_minutes || 0;
      map.set(label, current);
    });

    return Array.from(map.values()).map((m) => ({
      month_label: m.label,
      distance_km: Number(m.distance.toFixed(2)),
      workouts: m.count,
      duration_minutes: Number(m.duration.toFixed(1)),
    }));
  }
}
