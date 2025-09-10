export interface User {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  colorIndex: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  clientName?: string;
  assignedTo: string;
  assignedToName?: string;
  date: Date;
  estimatedDuration: number;
  actualDuration?: number;
  status: ActivityStatus;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type ActivityStatus = 
  | 'pending'
  | 'doing' 
  | 'waiting-client'
  | 'waiting-team'
  | 'completed';

export type RecurrenceType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom';

export interface TimeLog {
  id: string;
  activityId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  minutes: number;
  description?: string;
}

export const STATUS_LABELS = {
  pending: '🟡 Pendente',
  doing: '🔵 Fazendo',
  'waiting-client': '🟠 Aguardando Cliente',
  'waiting-team': '🟣 Aguardando Equipe',
  completed: '🟢 Concluído'
} as const;

export const STATUS_COLORS = {
  pending: 'status-pending',
  doing: 'status-doing',
  'waiting-client': 'status-waiting-client',
  'waiting-team': 'status-waiting-team',
  completed: 'status-completed'
} as const;