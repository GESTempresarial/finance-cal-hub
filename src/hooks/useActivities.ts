import { useState, useEffect } from 'react';
import { Activity } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useActivities() {
  const [activities, setActivities] = useLocalStorage<Activity[]>('bpo-activities', []);

  const createActivity = (activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setActivities(prev => [...prev, newActivity]);
    return newActivity;
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === id 
          ? { ...activity, ...updates, updatedAt: new Date() }
          : activity
      )
    );
  };

  const updateActivityStatus = (id: string, status: Activity['status']) => {
    const updates: Partial<Activity> = { 
      status,
      updatedAt: new Date()
    };

    if (status === 'doing' && !activities.find(a => a.id === id)?.startedAt) {
      updates.startedAt = new Date();
    }

    if (status === 'completed') {
      updates.completedAt = new Date();
    }

    updateActivity(id, updates);
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
  };

  return {
    activities,
    createActivity,
    updateActivity,
    updateActivityStatus,
    deleteActivity,
  };
}