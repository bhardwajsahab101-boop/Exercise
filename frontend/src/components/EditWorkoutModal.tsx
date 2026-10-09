import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import type { Workout } from '../types/workout';

interface EditWorkoutModalProps {
  workout: Workout | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Workout>) => Promise<void> | void;
  unitDistance?: 'km' | 'mi';
}

export const EditWorkoutModal: React.FC<EditWorkoutModalProps> = ({
  workout,
  isOpen,
  onClose,
  onSave,
  unitDistance = 'km',
}) => {
  const [date, setDate] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [sets, setSets] = useState<string>('');
  const [repsPerSet, setRepsPerSet] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workout && isOpen) {
      setDate(workout.date || new Date().toISOString().split('T')[0]);
      setDistance(workout.distance_km ? workout.distance_km.toString() : '');
      setSets(workout.sets ? workout.sets.toString() : '');
      setRepsPerSet(workout.reps_per_set ? workout.reps_per_set.toString() : '');
      setDuration(workout.duration_minutes ? workout.duration_minutes.toString() : '');
      setNotes(workout.notes || '');
      setError(null);
    }
  }, [workout, isOpen]);

  if (!isOpen || !workout) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const patch: Partial<Workout> = {
        date,
        notes: notes.trim() || null,
        duration_minutes: duration ? parseFloat(duration) : null,
      };

      if (workout.type === 'run') {
        patch.distance_km = distance ? parseFloat(distance) : null;
      } else {
        patch.sets = sets ? parseInt(sets, 10) : null;
        patch.reps_per_set = repsPerSet ? parseInt(repsPerSet, 10) : null;
        if (patch.sets && patch.reps_per_set) {
          patch.total_reps = patch.sets * patch.reps_per_set;
        }
      }

      await onSave(workout.id, patch);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update workout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Edit3 className="text-brand-accent" size={22} />
            <h3>Edit Workout</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="log-form">
          <div className="form-group">
            <label className="input-label">Exercise Type</label>
            <div className="exercise-type-badge-display">
              <span className={`badge badge-${workout.type}`}>
                {workout.type.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="edit-date">Date</label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {workout.type === 'run' ? (
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="input-label" htmlFor="edit-distance">
                  Distance ({unitDistance.toUpperCase()})
                </label>
                <input
                  id="edit-distance"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label className="input-label" htmlFor="edit-duration">Duration (Minutes)</label>
                <input
                  id="edit-duration"
                  type="number"
                  step="1"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="input-label" htmlFor="edit-sets">Sets</label>
                  <input
                    id="edit-sets"
                    type="number"
                    step="1"
                    min="1"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="input-label" htmlFor="edit-reps">Reps per set</label>
                  <input
                    id="edit-reps"
                    type="number"
                    step="1"
                    min="1"
                    value={repsPerSet}
                    onChange={(e) => setRepsPerSet(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="input-label" htmlFor="edit-duration-opt">Duration (Minutes)</label>
                <input
                  id="edit-duration-opt"
                  type="number"
                  step="1"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="input-label" htmlFor="edit-notes">Notes</label>
            <textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input textarea"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .exercise-type-badge-display {
          padding: 0.2rem 0;
        }
      `}</style>
    </div>
  );
};
