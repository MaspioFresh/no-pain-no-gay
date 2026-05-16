import React, { useState, useMemo, useEffect } from 'react';
import { WorkoutSession, WorkoutPlan, AppSettings } from '../types';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressViewProps {
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  settings: AppSettings;
  onBack: () => void;
}

export function ProgressView({ sessions, plans, settings, onBack }: ProgressViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const exerciseType = selectedPlan?.exercises.find(e => e.id === selectedExerciseId)?.type;
  const isCardio = exerciseType === 'cardio';
  const isTime = exerciseType === 'time';

  // Initialize selected exercise if plan changes
  useEffect(() => {
    if (selectedPlan && selectedPlan.exercises.length > 0) {
      if (!selectedPlan.exercises.find(e => e.id === selectedExerciseId)) {
        setSelectedExerciseId(selectedPlan.exercises[0].id);
      }
    } else {
      setSelectedExerciseId('');
    }
  }, [selectedPlanId, selectedPlan, selectedExerciseId]);

  const chartData = useMemo(() => {
    if (!selectedPlanId || !selectedExerciseId) return [];

    // Filter sessions for the selected plan, sort by date ascending
    const relevantSessions = [...sessions]
      .filter(s => s.planId === selectedPlanId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const data: any[] = [];

    relevantSessions.forEach(session => {
      const exerciseLog = session.exercises.find(e => e.exerciseId === selectedExerciseId);
      if (exerciseLog) {
        let maxRawWeight = 0;
        let totalVolume = 0;
        let totalDistance = 0;
        let totalTime = 0;
        let validSets = 0;

        const isPerSide = exerciseType === 'barbell' || !exerciseType
          ? settings.barbellMode === 'perSide'
          : exerciseType === 'dumbbell'
            ? settings.dumbbellMode === 'perSide'
            : exerciseType === 'plateLoaded'
              ? settings.plateLoadedMode === 'perSide'
              : false;

        exerciseLog.sets.forEach(set => {
          if (exerciseType === 'cardio') {
            if (set.completed || (set.distance || 0) > 0 || (set.timeSeconds || 0) > 0) {
               totalDistance += set.distance || 0;
               totalTime += set.timeSeconds || 0;
               validSets++;
            }
          } else if (exerciseType === 'time') {
            if (set.completed || (set.timeSeconds || 0) > 0) {
               maxRawWeight = Math.max(maxRawWeight, set.weight || 0);
               totalTime += set.timeSeconds || 0;
               validSets++;
            }
          } else {
            if (set.completed || ((set.weight || 0) > 0 && (set.reps || 0) > 0)) {
               maxRawWeight = Math.max(maxRawWeight, set.weight || 0);
               totalVolume += (set.weight || 0) * (set.reps || 0);
               validSets++;
            }
          }
        });

        if (validSets > 0) {
          let metric1Value = maxRawWeight;
          if (isPerSide && !isCardio) {
            if (exerciseType === 'barbell' || exerciseType === 'plateLoaded') {
              metric1Value = (maxRawWeight - (exerciseLog.barbellWeightUsed || 0)) / 2;
            } else {
              metric1Value = maxRawWeight / 2;
            }
          }

          data.push({
            date: new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            metric1: isCardio ? totalDistance : metric1Value,
            metric2: (isCardio || isTime) ? totalTime : totalVolume
          });
        }
      }
    });

    return data;
  }, [sessions, selectedPlanId, selectedExerciseId, settings, exerciseType, isCardio, isTime]);
  
  const metric1Title = isCardio ? 'Distanza Totale' : 'Peso Massimo';
  const metric1Desc = isCardio ? 'Distanza percorsa cumulativa' : 'Miglioramento del carico massimo sollevato/usato';
  
  const metric2Title = (isCardio || isTime) ? 'Tempo Totale' : 'Volume Totale';
  const metric2Desc = (isCardio || isTime) ? 'Minuti/Secondi cumulativi' : 'Carico totale (Serie × Ripetizioni × Peso)';

  return (
    <div className="flex flex-col space-y-6 pb-24 animate-in fade-in duration-300">
      <header className="flex items-center space-x-4 py-4 border-b border-white/10">
        <button onClick={onBack} className="p-2 rounded-full bg-transparent border border-accent text-accent hover:bg-accent/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-accent" />
          <h2 className="text-2xl font-bold">Progressi</h2>
        </div>
      </header>

      <div className="space-y-4">
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-white/50 mono-label">Scheda</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id} className="bg-[#151619]">{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-white/50 mono-label">Esercizio</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={!selectedPlan}
            >
              {selectedPlan?.exercises.map(ex => (
                <option key={ex.id} value={ex.id} className="bg-[#151619]">{ex.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Charts */}
        {chartData.length === 0 ? (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30">
            Nessun dato sufficiente per questo esercizio. Completa degli allenamenti per vedere i grafici.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="hardware-card p-4 space-y-4 bg-white/[0.02]">
              <div>
                <h3 className="font-bold text-accent">{metric1Title}</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-tighter">{metric1Desc}</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}`} width={30} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(220,252,4,0.2)', borderRadius: '8px' }}
                      itemStyle={{ color: '#dcfc04' }}
                    />
                    <Line type="monotone" dataKey="metric1" name={metric1Title} stroke="#dcfc04" strokeWidth={3} dot={{ fill: '#0c0d0e', stroke: '#dcfc04', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="hardware-card p-4 space-y-4 bg-white/[0.02]">
              <div>
                <h3 className="font-bold text-accent">{metric2Title}</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-tighter">{metric2Desc}</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} width={40} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(220,252,4,0.2)', borderRadius: '8px' }}
                      itemStyle={{ color: '#dcfc04' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="metric2" name={metric2Title} fill="#dcfc04" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
