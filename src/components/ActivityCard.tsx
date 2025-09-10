import { Activity, Client, STATUS_LABELS, STATUS_COLORS } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: Activity;
  client: Client;
  onStatusChange: (activityId: string, status: Activity['status']) => void;
  onStartTimer: (activityId: string) => void;
  onStopTimer: (activityId: string) => void;
  isTimerActive?: boolean;
}

export function ActivityCard({ 
  activity, 
  client, 
  onStatusChange, 
  onStartTimer, 
  onStopTimer,
  isTimerActive 
}: ActivityCardProps) {
  const isOverdue = new Date(activity.dueDate) < new Date() && activity.status !== 'completed';
  const isShortTask = activity.estimatedMinutes <= 30;
  
  const handleStatusClick = () => {
    const statuses: Activity['status'][] = ['pending', 'doing', 'waiting-client', 'waiting-team', 'completed'];
    const currentIndex = statuses.indexOf(activity.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onStatusChange(activity.id, nextStatus);
  };

  const handleTimerToggle = () => {
    if (isTimerActive) {
      onStopTimer(activity.id);
    } else {
      onStartTimer(activity.id);
    }
  };

  return (
    <Card 
      className={cn(
        "p-3 hover:shadow-medium transition-all duration-200 cursor-pointer border-l-4",
        isShortTask ? "min-h-[80px]" : "min-h-[120px]",
        isOverdue && "ring-2 ring-destructive/30 border-destructive",
        activity.status === 'completed' && "opacity-75"
      )}
      style={{
        borderLeftColor: `hsl(var(--client-${client.colorIndex}))`
      }}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">
              {activity.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {client.name}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {activity.status === 'doing' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTimerToggle();
                }}
              >
                {isTimerActive ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            )}
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {activity.estimatedMinutes}min
            </span>
          </div>
        </div>

        {/* Description */}
        {activity.description && !isShortTask && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs px-2 py-0.5 cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: `hsl(var(--${STATUS_COLORS[activity.status]})/0.1)`,
              color: `hsl(var(--${STATUS_COLORS[activity.status]}))`,
              borderColor: `hsl(var(--${STATUS_COLORS[activity.status]})/0.2)`
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusClick();
            }}
          >
            {STATUS_LABELS[activity.status]}
          </Badge>
          
          {activity.actualMinutes && (
            <span className="text-xs text-muted-foreground">
              Real: {activity.actualMinutes}min
            </span>
          )}
        </div>

        {/* Timer indicator */}
        {isTimerActive && (
          <div 
            className="flex items-center gap-1 text-xs animate-pulse-soft"
            style={{ color: `hsl(var(--status-doing))` }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse-soft"
              style={{ backgroundColor: `hsl(var(--status-doing))` }}
            />
            Timer ativo
          </div>
        )}
      </div>
    </Card>
  );
}