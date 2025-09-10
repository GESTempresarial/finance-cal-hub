import { useState } from 'react';
import { Activity, Client } from '@/types';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarProps {
  activities: Activity[];
  clients: Client[];
  currentUser: string;
  onStatusChange: (activityId: string, status: Activity['status']) => void;
  onStartTimer: (activityId: string) => void;
  onStopTimer: (activityId: string) => void;
  activeTimers: Set<string>;
  onCreateActivity: () => void;
}

export function Calendar({ 
  activities, 
  clients, 
  currentUser,
  onStatusChange, 
  onStartTimer, 
  onStopTimer,
  activeTimers,
  onCreateActivity
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity => 
      isSameDay(new Date(activity.dueDate), day)
    );
  };

  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Button onClick={onCreateActivity} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="p-3 text-center font-medium text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayActivities = getActivitiesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-b p-2 min-h-[120px] overflow-y-auto",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday(day) && "bg-primary/5 border-primary/20"
              )}
            >
              {/* Day Number */}
              <div className={cn(
                "font-medium text-sm mb-2 flex items-center justify-center w-6 h-6 rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>

              {/* Activities */}
              <div className="space-y-1">
                {dayActivities.map((activity) => {
                  const client = getClientById(activity.clientId);
                  if (!client) return null;

                  return (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      client={client}
                      onStatusChange={onStatusChange}
                      onStartTimer={onStartTimer}
                      onStopTimer={onStopTimer}
                      isTimerActive={activeTimers.has(activity.id)}
                    />
                  );
                })}
              </div>

              {/* Workload Indicator */}
              {dayActivities.length > 3 && (
                <div className="mt-1 text-xs text-center text-muted-foreground">
                  +{dayActivities.length - 3} mais
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}