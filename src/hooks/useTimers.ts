import { useState, useEffect, useRef } from 'react';

export function useTimers() {
  const [activeTimers, setActiveTimers] = useState<Map<string, number>>(new Map());
  const [timerIntervals, setTimerIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [runningActivityId, setRunningActivityId] = useState<string | null>(null);
  const [timerStateVersion, setTimerStateVersion] = useState(0); // Versão para forçar re-render
  
  // Usar refs para ter sempre o valor mais atual
  const activeTimersRef = useRef<Map<string, number>>(new Map());
  const timerIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Sincronizar refs com states
  useEffect(() => {
    activeTimersRef.current = activeTimers;
  }, [activeTimers]);

  const startTimer = (activityId: string) => {
    // Se já tem um timer rodando, não fazer nada
    if (timerIntervalsRef.current.has(activityId)) return;

    // Obter tempo acumulado anterior (se existir)
    const previousTime = activeTimersRef.current.get(activityId) || 0;
    
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
    
    setTimerIntervals(prev => {
      const newMap = new Map(prev);
      newMap.set(activityId, interval);
      // Atualizar ref imediatamente
      timerIntervalsRef.current.set(activityId, interval);
      return newMap;
    });
    setRunningActivityId(activityId);
    setTimerStateVersion(v => v + 1); // Incrementar versão para forçar re-render
  };

  const pauseTimer = (activityId: string) => {
    const interval = timerIntervalsRef.current.get(activityId);
    if (interval) {
      clearInterval(interval);
      setTimerIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(activityId);
        return newMap;
      });
      // Atualizar ref imediatamente
      timerIntervalsRef.current.delete(activityId);
    }
    if (runningActivityId === activityId) {
      setRunningActivityId(null);
    }
    setTimerStateVersion(v => v + 1); // Incrementar versão para forçar re-render
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
    return activeTimersRef.current.get(activityId) || 0;
  };

  const isTimerRunning = (activityId: string): boolean => {
    return timerIntervalsRef.current.has(activityId);
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
      timerIntervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  return {
    activeTimers,
    runningActivityId,
    timerStateVersion, // Exportar versão para componentes que precisam re-renderizar
    startTimer,
    pauseTimer,
    stopTimer,
    getTimerSeconds,
    isTimerRunning,
    formatTimer,
  };
}