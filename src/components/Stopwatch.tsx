import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface StopwatchProps {
  onLap?: (time: number) => void;
  compact?: boolean;
  startTime?: number | null;
}

export function Stopwatch({ onLap, compact, startTime }: StopwatchProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = React.useRef<number | null>(null);
  const accumulatedTimeRef = React.useRef<number>(0);

  // Sync with startTime if provided for persistence
  useEffect(() => {
    if (startTime) {
      const update = () => setTime(Date.now() - startTime);
      update();
      const interval = setInterval(update, 100);
      return () => clearInterval(interval);
    }
  }, [startTime]);

  // Sync manual stopwatch when page visibility changes (wakes up from screen off)
  useEffect(() => {
    if (startTime) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && startTimeRef.current !== null) {
        setTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, startTime]);

  // Manual stopwatch logic (only if NO startTime)
  useEffect(() => {
    if (startTime) return;
    
    let interval: any;
    if (isRunning) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          setTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
        }
      }, 100);
    }
    return () => {
      clearInterval(interval);
      if (isRunning && startTimeRef.current !== null) {
        accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
    };
  }, [isRunning, startTime]);

  const reset = () => {
    if (startTime) return; 
    setTime(0);
    setIsRunning(false);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = null;
  };

  const toggle = () => {
    if (startTime) return;
    setIsRunning(!isRunning);
  };

  // Helper to determine if visual "running" state should be active
  const activeRunning = startTime ? true : isRunning;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
        <div className="text-lg font-mono font-bold tracking-tighter tabular-nums text-accent">
          {formatTime(time)}
        </div>
        {!startTime && (
          <div className="flex space-x-2">
            <button
              onClick={toggle}
              className={`p-1.5 rounded-full ${
                activeRunning ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {activeRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={reset}
              className="p-1.5 rounded-full text-white/40 hover:text-white"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hardware-card p-4 flex flex-col items-center justify-center space-y-4">
      <div className="flex items-center space-x-2 mono-label">
        <Timer size={14} className={`accent-text ${activeRunning ? 'animate-pulse' : ''}`} />
        <span>Rest Timer / Stopwatch</span>
      </div>
      
      <div className="text-4xl font-mono font-bold tracking-tighter tabular-nums text-accent drop-shadow-[0_0_10px_rgba(220,252,4,0.3)]">
        {formatTime(time)}
      </div>

      {!startTime && (
        <div className="flex space-x-4">
          <button
            onClick={toggle}
            className={`px-6 py-2 rounded-full font-bold flex items-center space-x-2 transition-all ${
              activeRunning ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
            } border border-current/20`}
          >
            {activeRunning ? <Pause size={18} /> : <Play size={18} />}
            <span>{activeRunning ? 'PAUSA' : 'START'}</span>
          </button>
          
          <button
            onClick={reset}
            className="p-3 rounded-full bg-white/5 text-white/60 hover:text-white transition-all border border-white/10"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
