import { useState, useEffect } from 'react';

export function useTimers() {
  const [activeTimers, setActiveTimers] = useState<Set<string>>(new Set());
  const [timerIntervals, setTimerIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const startTimer = (activityId: string) => {
    if (activeTimers.has(activityId)) return;

    setActiveTimers(prev => new Set([...prev, activityId]));
    
    const interval = setInterval(() => {
      // Timer logic could be expanded here
      console.log(`Timer running for activity ${activityId}`);
    }, 1000);
    
    setTimerIntervals(prev => new Map([...prev, [activityId, interval]]));
  };

  const stopTimer = (activityId: string) => {
    const interval = timerIntervals.get(activityId);
    if (interval) {
      clearInterval(interval);
      setTimerIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(activityId);
        return newMap;
      });
    }
    
    setActiveTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(activityId);
      return newSet;
    });
  };

  useEffect(() => {
    return () => {
      timerIntervals.forEach(interval => clearInterval(interval));
    };
  }, [timerIntervals]);

  return {
    activeTimers,
    startTimer,
    stopTimer,
  };
}