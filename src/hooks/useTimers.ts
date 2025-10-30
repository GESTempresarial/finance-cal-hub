import { useState, useEffect } from 'react';

export function useTimers() {
  const [activeTimers, setActiveTimers] = useState<Map<string, number>>(new Map());
  const [timerIntervals, setTimerIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [runningActivityId, setRunningActivityId] = useState<string | null>(null);

  const startTimer = (activityId: string) => {
    // Se já tem um timer rodando, não fazer nada
    if (timerIntervals.has(activityId)) return;

    // Obter tempo acumulado anterior (se existir)
    const previousTime = activeTimers.get(activityId) || 0;
    
    // Iniciar contador a partir do tempo acumulado
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const newMap = new Map(prev);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        newMap.set(activityId, previousTime + elapsed);
        return newMap;
      });
    }, 1000);
    
    setTimerIntervals(prev => new Map(prev).set(activityId, interval));
    setRunningActivityId(activityId);
  };

  const pauseTimer = (activityId: string) => {
    const interval = timerIntervals.get(activityId);
    if (interval) {
      clearInterval(interval);
      setTimerIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(activityId);
        return newMap;
      });
    }
    if (runningActivityId === activityId) {
      setRunningActivityId(null);
    }
  };

  const stopTimer = (activityId: string) => {
    pauseTimer(activityId);
    // Também limpar o tempo acumulado
    setActiveTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(activityId);
      return newMap;
    });
  };

  const getTimerSeconds = (activityId: string): number => {
    return activeTimers.get(activityId) || 0;
  };

  const isTimerRunning = (activityId: string): boolean => {
    return timerIntervals.has(activityId);
  };

  const formatTimer = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      timerIntervals.forEach(interval => clearInterval(interval));
    };
  }, [timerIntervals]);

  return {
    activeTimers,
    runningActivityId,
    startTimer,
    pauseTimer,
    stopTimer,
    getTimerSeconds,
    isTimerRunning,
    formatTimer,
  };
}