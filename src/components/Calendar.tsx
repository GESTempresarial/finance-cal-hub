import { useState } from 'react';
import { Activity, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
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
  onActivityClick?: (activityId: string) => void;
  onUpdateActivity?: (id: string, updates: Partial<Activity>) => void;
  onDayCreate?: (date: Date) => void;
}

export function Calendar({ 
  activities, 
  clients, 
  currentUser,
  onStatusChange, 
  onStartTimer, 
  onStopTimer,
  activeTimers,
  onCreateActivity,
  onActivityClick,
  onUpdateActivity,
  onDayCreate,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  // Para visão mensal precisamos preencher a grade começando no domingo da primeira semana que contém o dia 1
  let periodStart: Date;
  let periodEnd: Date;
  let days: Date[] = [];
  if (view === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // domingo anterior ou o próprio dia 1
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // sábado da última semana
    periodStart = monthStart; // usado apenas para exibição (mês/ano)
    periodEnd = monthEnd;
    days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  } else {
    periodStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    periodEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    days = eachDayOfInterval({ start: periodStart, end: periodEnd });
  }

  // Lê metadados de recorrência embutidos na descrição
  const parseRecurrence = (activity: Activity): { type?: 'daily'|'weekly'; endDate?: Date; weekDays?: number[], completedDates?: string[], includeWeekends?: boolean } => {
    const result: { type?: 'daily'|'weekly'; endDate?: Date; weekDays?: number[], completedDates?: string[], includeWeekends?: boolean } = {};
    if (!activity.description) return result;
    const match = activity.description.match(/<recurrence>(.*?)<\/recurrence>/);
    if (!match) return result;
    try {
      const meta = JSON.parse(match[1]);
      if (meta.type === 'daily' || meta.type === 'weekly') result.type = meta.type;
      if (meta.endDate) {
        const [y,m,d] = String(meta.endDate).split('-').map(Number);
        if (y && m && d) result.endDate = new Date(y, m-1, d);
      }
      if (Array.isArray(meta.weekDays)) result.weekDays = meta.weekDays as number[];
      if (Array.isArray(meta.completedDates)) result.completedDates = meta.completedDates as string[];
      if (typeof meta.includeWeekends === 'boolean') result.includeWeekends = meta.includeWeekends;
    } catch {}
    return result;
  };

  const getActivitiesForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0,0,0,0);

    return activities.filter(activity => {
      const start = new Date(activity.date);
      start.setHours(0,0,0,0);

      // Não recorrente: só no dia exato
      if (!activity.isRecurring) return isSameDay(start, dayStart);

      // Recorrente: usar metadados
      const meta = parseRecurrence(activity);
      const end = meta.endDate ? new Date(meta.endDate) : start;
      end.setHours(0,0,0,0);
      if (dayStart < start || dayStart > end) return false;

      const type = activity.recurrenceType || meta.type;
      if (type === 'daily') {
        const includeWeekends = (meta as any).includeWeekends !== false; // default true
        const wd = dayStart.getDay();
        if (!includeWeekends && (wd === 0 || wd === 6)) return false;
        return true;
      }
      if (type === 'weekly') {
        const weekDays = (meta.weekDays && meta.weekDays.length) ? meta.weekDays : [start.getDay()];
        return weekDays.includes(dayStart.getDay());
      }
      return isSameDay(start, dayStart);
    });
  };

  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        if (direction === 'prev') newDate.setMonth(prev.getMonth() - 1);
        else newDate.setMonth(prev.getMonth() + 1);
      } else {
        const delta = direction === 'prev' ? -7 : 7;
        newDate.setDate(prev.getDate() + delta);
      }
      return newDate;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                : `Semana de ${format(periodStart, 'dd/MM', { locale: ptBR })} a ${format(periodEnd, 'dd/MM', { locale: ptBR })}`}
            </h2>
            <div className="mt-1 inline-flex items-center gap-2">
              <Button size="sm" variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Mês</Button>
              <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Semana</Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('next')}
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
      <div className={cn(
        view === 'month'
          ? 'flex-1 grid grid-cols-7 auto-rows-fr'
          : 'grid grid-cols-7'
      )}>
        {days.map((day) => {
          const dayActivities = getActivitiesForDay(day);
          const isCurrentMonth = view === 'month' ? isSameMonth(day, currentDate) : true;
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-b p-2',
                view === 'month' && 'min-h-[120px] overflow-y-auto',
                !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                isToday(day) && 'bg-primary/5 border-primary/20'
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const activityId = e.dataTransfer.getData('text/plain');
                if (!activityId) return;
                const act = activities.find(a => a.id === activityId);
                if (!act) return;
                if (act.isRecurring) return; // por ora, não mover recorrentes
                // Atualiza data no banco
                onUpdateActivity?.(activityId, { date: new Date(day) });
              }}
              onClick={(e) => {
                // Clique no fundo do dia (não em um card)
                onDayCreate?.(new Date(day));
              }}
            >
              {/* Day Number */}
              <div className={cn(
                'font-medium text-sm mb-2 flex items-center justify-center rounded-full',
                view === 'month' ? 'w-6 h-6' : 'w-5 h-5',
                isToday(day) && 'bg-primary text-primary-foreground'
              )}>
                {format(day, 'd')}
              </div>

              {/* Activities */}
              <div className={cn('space-y-1', view === 'week' && 'space-y-0.5')}
              >
                {dayActivities.map((activity) => {
                  const client = getClientById(activity.clientId);
                  if (!client) return null;

                  // Card minimal: cor do cliente, nome e status
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const meta = parseRecurrence(activity);
                  const isCompletedOccurrence = activity.isRecurring
                    ? !!meta.completedDates?.includes(dateStr)
                    : activity.status === 'completed';

                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        'cursor-pointer rounded px-2 py-1 bg-card hover:bg-primary/10 flex items-center gap-2 border border-muted',
                        view === 'week' && 'py-0.5'
                      )}
                      title={activity.title}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onActivityClick?.(activity.id); }}
                      draggable={!activity.isRecurring}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', activity.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                        aria-hidden
                      />
                      <span className="truncate font-medium text-xs flex-1">{activity.title}</span>
                      <span className="text-xs">{isCompletedOccurrence ? '✔️' : ''}</span>
                    </div>
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