import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UserPayload } from '../auth/user.decorator';

export interface WorkoutEntity {
  id: string;
  user_id: string;
  type: string;
  date: string;
  distance_km?: number | null;
  sets?: number | null;
  reps_per_set?: number | null;
  total_reps?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);
  
  // In-memory fallback storage for guest / local development when Supabase isn't configured
  private inMemoryWorkouts: WorkoutEntity[] = [];

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(
    user: UserPayload,
    query?: { type?: string; start_date?: string; end_date?: string; query?: string },
    userToken?: string,
  ): Promise<WorkoutEntity[]> {
    const supabase = this.supabaseService.getClient(userToken);

    if (supabase) {
      let qb = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (query?.type) qb = qb.eq('type', query.type);
      if (query?.start_date) qb = qb.gte('date', query.start_date);
      if (query?.end_date) qb = qb.lte('date', query.end_date);

      const { data, error } = await qb;
      if (error) {
        this.logger.error('Error fetching workouts from Supabase:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    // Fallback: In-memory store
    let result = this.inMemoryWorkouts.filter((w) => w.user_id === user.id);
    if (query?.type) result = result.filter((w) => w.type === query.type);
    if (query?.start_date) {
      const sDate = query.start_date;
      result = result.filter((w) => w.date >= sDate);
    }
    if (query?.end_date) {
      const eDate = query.end_date;
      result = result.filter((w) => w.date <= eDate);
    }
    if (query?.query) {
      const q = query.query.toLowerCase();
      result = result.filter((w) => w.type.toLowerCase().includes(q) || (w.notes && w.notes.toLowerCase().includes(q)));
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async findOne(user: UserPayload, id: string, userToken?: string): Promise<WorkoutEntity> {
    const supabase = this.supabaseService.getClient(userToken);

    if (supabase) {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Workout with ID ${id} not found`);
      }
      return data;
    }

    const item = this.inMemoryWorkouts.find((w) => w.id === id && w.user_id === user.id);
    if (!item) throw new NotFoundException(`Workout with ID ${id} not found`);
    return item;
  }

  async create(user: UserPayload, dto: CreateWorkoutDto, userToken?: string): Promise<WorkoutEntity> {
    const supabase = this.supabaseService.getClient(userToken);
    const totalReps =
      dto.sets && dto.reps_per_set ? dto.sets * dto.reps_per_set : dto.total_reps || null;

    if (supabase) {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          type: dto.type,
          date: dto.date,
          distance_km: dto.distance_km || null,
          sets: dto.sets || null,
          reps_per_set: dto.reps_per_set || null,
          duration_minutes: dto.duration_minutes || null,
          notes: dto.notes || null,
        })
        .select('*')
        .single();

      if (error) {
        this.logger.error('Error creating workout in Supabase:', error);
        throw new Error(error.message);
      }
      return data;
    }

    // Fallback in-memory
    const newWorkout: WorkoutEntity = {
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      type: dto.type,
      date: dto.date,
      distance_km: dto.distance_km || null,
      sets: dto.sets || null,
      reps_per_set: dto.reps_per_set || null,
      total_reps: totalReps,
      duration_minutes: dto.duration_minutes || null,
      notes: dto.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.inMemoryWorkouts.unshift(newWorkout);
    return newWorkout;
  }

  async update(user: UserPayload, id: string, dto: UpdateWorkoutDto, userToken?: string): Promise<WorkoutEntity> {
    const supabase = this.supabaseService.getClient(userToken);

    if (supabase) {
      const { data, error } = await supabase
        .from('workouts')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error || !data) {
        throw new NotFoundException(`Workout with ID ${id} not found or update failed`);
      }
      return data;
    }

    // Fallback in-memory update
    const index = this.inMemoryWorkouts.findIndex((w) => w.id === id && w.user_id === user.id);
    if (index === -1) throw new NotFoundException(`Workout with ID ${id} not found`);

    const current = this.inMemoryWorkouts[index];
    const sets = dto.sets !== undefined ? dto.sets : current.sets;
    const reps_per_set = dto.reps_per_set !== undefined ? dto.reps_per_set : current.reps_per_set;
    const total_reps = sets && reps_per_set ? sets * reps_per_set : dto.total_reps !== undefined ? dto.total_reps : current.total_reps;

    const updated: WorkoutEntity = {
      ...current,
      ...dto,
      sets,
      reps_per_set,
      total_reps,
      updated_at: new Date().toISOString(),
    };

    this.inMemoryWorkouts[index] = updated;
    return updated;
  }

  async remove(user: UserPayload, id: string, userToken?: string): Promise<{ success: boolean }> {
    const supabase = this.supabaseService.getClient(userToken);

    if (supabase) {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    const index = this.inMemoryWorkouts.findIndex((w) => w.id === id && w.user_id === user.id);
    if (!index && index !== 0) throw new NotFoundException(`Workout with ID ${id} not found`);

    this.inMemoryWorkouts.splice(index, 1);
    return { success: true };
  }

  async syncBatch(user: UserPayload, workouts: CreateWorkoutDto[], userToken?: string): Promise<{ syncedCount: number }> {
    let syncedCount = 0;
    for (const w of workouts) {
      await this.create(user, w, userToken);
      syncedCount++;
    }
    return { syncedCount };
  }

  async getSummary(user: UserPayload, userToken?: string) {
    const list = await this.findAll(user, undefined, userToken);
    const totalCount = list.length;
    const totalDistance = list.reduce((acc, w) => acc + (w.distance_km || 0), 0);
    const totalReps = list.reduce((acc, w) => acc + (w.total_reps || 0), 0);
    const totalDuration = list.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);

    return {
      total_workouts: totalCount,
      total_distance_km: totalDistance,
      total_reps: totalReps,
      total_duration_minutes: totalDuration,
    };
  }
}
