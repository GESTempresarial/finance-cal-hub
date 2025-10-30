import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);

  const formatDateOnly = (d: Date) => format(d, 'yyyy-MM-dd');
  const parseDateOnly = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          clients (
            id,
            name,
            color_index,
            is_active
          ),
          users (
            id,
            name
          )
        `)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      const formattedActivities = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        clientId: item.client_id,
        clientName: item.clients?.name || '',
        assignedTo: item.assigned_to,
        assignedToName: item.users?.name || '',
        assignedUsers: item.assigned_users || [item.assigned_to],
        date: typeof item.date === 'string' ? parseDateOnly(item.date) : new Date(item.date),
        estimatedDuration: item.estimated_duration,
        actualDuration: item.actual_duration,
        status: item.status as Activity['status'],
        isRecurring: item.is_recurring,
        recurrenceType: item.recurrence_type as Activity['recurrenceType'],
        startedAt: item.started_at ? new Date(item.started_at) : undefined,
        completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
      
      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const createActivity = async (activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          title: activityData.title,
          description: activityData.description,
          client_id: activityData.clientId,
          assigned_to: activityData.assignedTo,
          assigned_users: activityData.assignedUsers || [activityData.assignedTo],
          date: formatDateOnly(activityData.date),
          estimated_duration: activityData.estimatedDuration,
          actual_duration: activityData.actualDuration,
          status: activityData.status,
          is_recurring: activityData.isRecurring || false,
          recurrence_type: activityData.recurrenceType,
          started_at: activityData.startedAt?.toISOString(),
          completed_at: activityData.completedAt?.toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newActivity: Activity = {
        id: data.id,
        title: data.title,
        description: data.description,
        clientId: data.client_id,
        clientName: activityData.clientName,
        assignedTo: data.assigned_to,
        assignedToName: activityData.assignedToName,
        assignedUsers: data.assigned_users || [data.assigned_to],
  date: typeof data.date === 'string' ? parseDateOnly(data.date) : new Date(data.date),
        estimatedDuration: data.estimated_duration,
        actualDuration: data.actual_duration,
        status: data.status as Activity['status'],
        isRecurring: data.is_recurring,
        recurrenceType: data.recurrence_type as Activity['recurrenceType'],
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      setActivities(prev => [...prev, newActivity]);
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          title: updates.title,
          description: updates.description,
          client_id: updates.clientId,
          assigned_to: updates.assignedTo,
          assigned_users: updates.assignedUsers,
          date: updates.date ? formatDateOnly(updates.date) : undefined,
          estimated_duration: updates.estimatedDuration,
          actual_duration: updates.actualDuration,
          status: updates.status,
          is_recurring: updates.isRecurring,
          recurrence_type: updates.recurrenceType,
          started_at: updates.startedAt?.toISOString(),
          completed_at: updates.completedAt?.toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setActivities(prev => 
        prev.map(activity => 
          activity.id === id 
            ? { ...activity, ...updates, updatedAt: new Date() }
            : activity
        )
      );
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  };

  const updateActivityStatus = async (id: string, status: Activity['status']) => {
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

    await updateActivity(id, updates);
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setActivities(prev => prev.filter(activity => activity.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  return {
    activities,
    createActivity,
    updateActivity,
    updateActivityStatus,
    deleteActivity,
  };
}