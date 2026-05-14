export type WeightUnit = 'kg' | 'lb' | 'km' | 'm';
export type ExerciseType = 'barbell' | 'dumbbell' | 'machine' | 'time' | 'cardio';

export interface PlanSet {
  reps?: number;
  weight?: number;
  timeSeconds?: number;
  distance?: number;
}

export interface Exercise {
  id: string;
  name: string;
  type?: ExerciseType;
  imageUrl?: string;
  notes?: string;
  barbellWeight?: number; // Default barbell weight for this exercise (only for barbell type)
  restSeconds?: number; // Default rest time in seconds
  targetSets: PlanSet[];
  supersetId?: string; // Links exercises that are part of the same superset
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

export interface SetEntry {
  reps?: number;
  weight?: number; // Total weight including barbell
  timeSeconds?: number;
  distance?: number;
  unit: WeightUnit;
  completed: boolean;
}

export interface ExerciseSession {
  exerciseId: string;
  sets: SetEntry[];
  barbellWeightUsed?: number; // The weight of the barbell used in this session
  notes?: string; // Personal notes for this session
  supersetId?: string; // Historical superset link
}

export interface AppSettings {
  unit: WeightUnit;
  themeColor?: string;
  weightEntryMode?: 'total' | 'perSide'; // legacy, keep for migration
  barbellMode?: 'total' | 'perSide';
  dumbbellMode?: 'total' | 'perSide';
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
