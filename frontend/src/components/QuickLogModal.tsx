import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Footprints, Flame, Dumbbell, Shield, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ExerciseType, Workout } from '../types/workout';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workoutData: Partial<Workout>) => Promise<void> | void;
  initialExercise?: ExerciseType;
  unitDistance?: 'km' | 'mi';
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExercise = 'run',
  unitDistance = 'km',
}) => {
  const [exercise, setExercise] = useState<ExerciseType>(initialExercise);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState<string>('');
  const [sets, setSets] = useState<string>('3');
  const [repsPerSet, setRepsPerSet] = useState<string>('15');
  const [duration, setDuration] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExercise(initialExercise);
      setDate(new Date().toISOString().split('T')[0]);
      setSuccessMessage(null);
      setErrors({});
      // Set default reps based on exercise type for convenience
      if (initialExercise === 'run') {
        setDistance('5.0');
        setDuration('25');
      } else if (initialExercise === 'pushups') {
        setSets('3');
        setRepsPerSet('20');
        setDuration('12');
      } else if (initialExercise === 'situps') {
        setSets('3');
        setRepsPerSet('30');
        setDuration('10');
      } else if (initialExercise === 'squats') {
        setSets('4');
        setRepsPerSet('25');
        setDuration('15');
      }
    }
  }, [isOpen, initialExercise]);

  if (!isOpen) return null;

  const handleExerciseChange = (newType: ExerciseType) => {
    setExercise(newType);
    setErrors({});
    if (newType === 'run') {
      if (!distance) setDistance('5.0');
      if (!duration) setDuration('25');
    } else {
      if (!sets) setSets('3');
      if (!repsPerSet) {
        if (newType === 'pushups') setRepsPerSet('20');
        if (newType === 'situps') setRepsPerSet('30');
        if (newType === 'squats') setRepsPerSet('25');
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!date) {
      errs.date = 'Please select a date.';
    }

    if (exercise === 'run') {
      const distNum = parseFloat(distance);
      if (isNaN(distNum) || distNum <= 0) {
        errs.distance = `Please enter a valid positive distance in ${unitDistance}.`;
      }
      if (duration) {
        const durNum = parseFloat(duration);
        if (isNaN(durNum) || durNum <= 0) {
          errs.duration = 'Duration must be a positive number of minutes.';
        }
      }
    } else {
      const setsNum = parseInt(sets, 10);
      if (isNaN(setsNum) || setsNum <= 0) {
        errs.sets = 'Please enter at least 1 set.';
      }

      const repsNum = parseInt(repsPerSet, 10);
      if (isNaN(repsNum) || repsNum <= 0) {
        errs.repsPerSet = 'Please enter at least 1 rep per set.';
      }

      if (duration) {
        const durNum = parseFloat(duration);
        if (isNaN(durNum) || durNum <= 0) {
          errs.duration = 'Duration must be a positive number of minutes.';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const workoutData: Partial<Workout> = {
        type: exercise,
        date,
        notes: notes.trim() || null,
        duration_minutes: duration ? parseFloat(duration) : null,
      };

      if (exercise === 'run') {
        workoutData.distance_km = parseFloat(distance);
      } else {
        workoutData.sets = parseInt(sets, 10);
        workoutData.reps_per_set = parseInt(repsPerSet, 10);
        workoutData.total_reps = workoutData.sets * workoutData.reps_per_set;
      }

      await onSave(workoutData);

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#52b788', '#1b4332', '#f4a261', '#e76f51'],
      });

      setSuccessMessage('Workout logged successfully!');
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to save workout' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotalReps =
    exercise !== 'run' && sets && repsPerSet
      ? parseInt(sets, 10) * parseInt(repsPerSet, 10)
      : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Sparkles className="text-brand-accent" size={22} />
            <h3>Log Workout</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {successMessage ? (
          <div className="success-banner">
            <CheckCircle size={40} className="success-icon" />
            <h4>Awesome job!</h4>
            <p>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="log-form">
            {errors.general && <div className="form-error-banner">{errors.general}</div>}

            {/* Exercise Type Tabs */}
            <div className="form-group">
              <label className="input-label">Select Exercise</label>
              <div className="exercise-selector-grid">
                <button
                  type="button"
                  onClick={() => handleExerciseChange('run')}
                  className={`exercise-option ${exercise === 'run' ? 'active run' : ''}`}
                >
                  <Footprints size={18} />
                  <span>Run</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExerciseChange('pushups')}
                  className={`exercise-option ${exercise === 'pushups' ? 'active pushups' : ''}`}
                >
                  <Flame size={18} />
                  <span>Push-ups</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExerciseChange('situps')}
                  className={`exercise-option ${exercise === 'situps' ? 'active situps' : ''}`}
                >
                  <Shield size={18} />
                  <span>Sit-ups</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExerciseChange('squats')}
                  className={`exercise-option ${exercise === 'squats' ? 'active squats' : ''}`}
                >
                  <Dumbbell size={18} />
                  <span>Squats</span>
                </button>
              </div>
            </div>

            {/* Date Field */}
            <div className="form-group">
              <label className="input-label" htmlFor="workout-date">Date</label>
              <input
                id="workout-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`form-input ${errors.date ? 'error' : ''}`}
                required
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>

            {/* Dynamic Exercise Fields */}
            {exercise === 'run' ? (
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="input-label" htmlFor="distance-input">
                    Distance ({unitDistance.toUpperCase()}) *
                  </label>
                  <input
                    id="distance-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 5.2"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className={`form-input ${errors.distance ? 'error' : ''}`}
                    required
                  />
                  {errors.distance && <span className="field-error">{errors.distance}</span>}
                </div>
                <div className="form-group flex-1">
                  <label className="input-label" htmlFor="duration-input">Duration (Minutes)</label>
                  <input
                    id="duration-input"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 25"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={`form-input ${errors.duration ? 'error' : ''}`}
                  />
                  {errors.duration && <span className="field-error">{errors.duration}</span>}
                </div>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="input-label" htmlFor="sets-input">Sets *</label>
                    <input
                      id="sets-input"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 3"
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                      className={`form-input ${errors.sets ? 'error' : ''}`}
                      required
                    />
                    {errors.sets && <span className="field-error">{errors.sets}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label className="input-label" htmlFor="reps-input">Reps per set *</label>
                    <input
                      id="reps-input"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 20"
                      value={repsPerSet}
                      onChange={(e) => setRepsPerSet(e.target.value)}
                      className={`form-input ${errors.repsPerSet ? 'error' : ''}`}
                      required
                    />
                    {errors.repsPerSet && <span className="field-error">{errors.repsPerSet}</span>}
                  </div>
                </div>

                {/* Total Reps summary box */}
                <div className="total-reps-preview">
                  <span>Total Reps Calculated:</span>
                  <strong>{isNaN(calculatedTotalReps) ? 0 : calculatedTotalReps} reps</strong>
                </div>

                <div className="form-group margin-top-sm">
                  <label className="input-label" htmlFor="non-run-duration">Duration (Optional Minutes)</label>
                  <input
                    id="non-run-duration"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={`form-input ${errors.duration ? 'error' : ''}`}
                  />
                  {errors.duration && <span className="field-error">{errors.duration}</span>}
                </div>
              </>
            )}

            {/* Notes Field */}
            <div className="form-group">
              <label className="input-label" htmlFor="workout-notes">Notes (Optional)</label>
              <textarea
                id="workout-notes"
                rows={2}
                placeholder="How did this workout feel? Any personal records?"
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
                {isSubmitting ? 'Saving...' : 'Save Workout'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .close-btn {
          color: var(--text-muted);
          padding: 0.35rem;
          border-radius: var(--radius-full);
        }
        .close-btn:hover {
          background-color: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .exercise-selector-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-top: 0.35rem;
        }

        @media (max-width: 480px) {
          .exercise-selector-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .exercise-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          padding: 0.75rem 0.5rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-medium);
          background-color: var(--bg-surface);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          transition: all var(--transition-fast);
        }

        .exercise-option:hover {
          border-color: var(--brand-accent);
          background-color: var(--bg-surface-hover);
        }

        .exercise-option.active {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 2px var(--brand-soft);
        }

        .exercise-option.active.run { background-color: #e3f2fd; color: #1565c0; border-color: #1976d2; }
        .exercise-option.active.pushups { background-color: #fbe9e7; color: #d84315; border-color: #e64a19; }
        .exercise-option.active.situps { background-color: #f3e5f5; color: #7b1fa2; border-color: #8e24aa; }
        .exercise-option.active.squats { background-color: #e8f5e9; color: #2e7d32; border-color: #388e3c; }

        .form-group {
          margin-bottom: 1.2rem;
          display: flex;
          flex-direction: column;
        }

        .input-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.35rem;
        }

        .form-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-medium);
          background-color: #ffffff;
          color: var(--text-primary);
          transition: border-color var(--transition-fast);
        }

        .form-input:focus {
          border-color: var(--brand-primary);
        }

        .form-input.error {
          border-color: #dc2626;
        }

        .field-error {
          color: #dc2626;
          font-size: 0.78rem;
          margin-top: 0.25rem;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .flex-1 { flex: 1; }

        .total-reps-preview {
          background-color: var(--brand-soft);
          border: 1px solid var(--brand-soft-border);
          border-radius: var(--radius-md);
          padding: 0.6rem 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.88rem;
          color: var(--brand-primary);
        }

        .textarea {
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .success-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 1rem;
          animation: fadeIn 0.3s ease-out;
        }

        .success-icon {
          color: var(--brand-accent);
          margin-bottom: 1rem;
        }

        .form-error-banner {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .margin-top-sm {
          margin-top: 0.75rem;
        }
      `}</style>
    </div>
  );
};
