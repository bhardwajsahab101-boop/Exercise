import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private readonly supabaseUrl: string | null = null;
  private readonly supabaseAnonKey: string | null = null;
  private readonly serviceRoleKey: string | null = null;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    this.supabaseUrl = url && !url.includes('placeholder') ? url.trim() : null;
    this.supabaseAnonKey = anonKey && !anonKey.includes('placeholder') ? anonKey.trim() : null;
    this.serviceRoleKey =
      serviceRoleKey &&
      !serviceRoleKey.includes('placeholder') &&
      !serviceRoleKey.startsWith('sb_publishable_') // If mistakenly set to publishable key, do not treat as secret
        ? serviceRoleKey.trim()
        : null;

    const key = this.serviceRoleKey || this.supabaseAnonKey;

    if (this.supabaseUrl && key) {
      this.client = createClient(this.supabaseUrl, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.logger.log(
        `Supabase client initialized (${this.serviceRoleKey ? 'with backend service-role secret key' : 'with anon public key'})`,
      );
    } else {
      this.logger.warn(
        'Supabase URL/Key missing or placeholder. Running in local memory/fallback mode until Supabase credentials are set in backend/.env',
      );
    }
  }

  /**
   * Returns a Supabase client.
   * If a userToken is provided, attaches the Bearer token in the Authorization header
   * so PostgreSQL Row Level Security (RLS) policies evaluate auth.uid() = user_id!
   * Otherwise returns the server service client.
   */
  getClient(userToken?: string): SupabaseClient | null {
    if (userToken && this.supabaseUrl && (this.supabaseAnonKey || this.serviceRoleKey)) {
      const apiKey = this.supabaseAnonKey || this.serviceRoleKey!;
      return createClient(this.supabaseUrl, apiKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return this.client;
  }

  async verifyToken(token: string): Promise<{ id: string; email?: string } | null> {
    if (!this.client && !this.supabaseUrl) return null;
    try {
      const authClient =
        this.client ||
        createClient(this.supabaseUrl!, (this.supabaseAnonKey || this.serviceRoleKey)!);
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return {
        id: data.user.id,
        email: data.user.email,
      };
    } catch (err) {
      this.logger.error('Error verifying token with Supabase Auth:', err);
      return null;
    }
  }
}
