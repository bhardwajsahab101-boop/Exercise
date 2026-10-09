import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (url && key && !url.includes('placeholder')) {
      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.logger.log('Supabase client initialized successfully');
    } else {
      this.logger.warn(
        'Supabase URL/Key missing or placeholder. Running in local memory/fallback mode until Supabase credentials are set in backend/.env',
      );
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  async verifyToken(token: string): Promise<{ id: string; email?: string } | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.auth.getUser(token);
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
