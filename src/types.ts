export type WeightUnit = 'kg' | 'lb';

export interface PlanSet {
  reps: number;
  weight?: number;
}

export interface Exercise {
  id: string;
  name: string;
  notes?: string;
  barbellWeight?: number; // Default barbell weight for this exercise
  restSeconds?: number; // Default rest time in seconds
  targetSets: PlanSet[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

export interface SetEntry {
  reps: number;
  weight: number; // Total weight including barbell
  unit: WeightUnit;
  completed: boolean;
}

export interface ExerciseSession {
  exerciseId: string;
  sets: SetEntry[];
  barbellWeightUsed?: number; // The weight of the barbell used in this session
  notes?: string; // Personal notes for this session
}

export interface AppSettings {
  unit: WeightUnit;
}

export interface WorkoutSession {
  id: string;
  planId: string;
  date: string; // ISO string
  exercises: ExerciseSession[];
  duration?: number; // in seconds
  unitAtTime: WeightUnit; // Keep track of unit used when saved
}

export interface AppData {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  settings: AppSettings;
}
