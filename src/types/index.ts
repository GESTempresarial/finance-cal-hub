export interface User {
  id: string;
  name: string;
  phone?: string;
  createdAt: Date;
  companyId?: string;
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
  pending: 'A Fazer',
  doing: 'Fazendo',
  completed: 'Feito'
} as const;

export const STATUS_COLORS = {
  pending: 'status-pending',
  doing: 'status-doing',
  completed: 'status-completed'
} as const;
