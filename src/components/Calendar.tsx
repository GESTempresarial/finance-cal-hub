import { useState } from 'react';
import { Activity, Client, STATUS_LABELS, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fireConfetti } from '@/lib/confetti';
import { RichTextEditor } from '@/components/RichTextEditor';

interface CalendarProps {
  activities: Activity[];
  clients: Client[];
  currentUser: string;
  users: User[];
  onStatusChange: (activityId: string, status: Activity['status']) => void;
  onStartTimer: (activityId: string) => void;
  onStopTimer: (activityId: string) => void;
  activeTimers: Map<string, number>;
  onCreateActivity: () => void;
  onActivityClick?: (activityId: string) => void;
  onUpdateActivity?: (id: string, updates: Partial<Activity>) => void;
  onDayCreate?: (date: Date) => void;
}

export function Calendar({ 
  activities, 
  clients, 
  currentUser,
  users,
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
  const [view, setView] = useState<'month' | 'week'>('week');
  
  // Estado para edição de atividade
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editData, setEditData] = useState<{
    title: string;
    description?: string;
    status: Activity['status'];
    assignedTo: string;
    selectedUsers: string[];
    clientId: string;
    date: Date;
  }>({ title: '', description: '', status: 'pending', assignedTo: '', selectedUsers: [], clientId: '', date: new Date() });
  const [recurrenceEdit, setRecurrenceEdit] = useState<{
    enabled: boolean;
    type: 'daily' | 'weekly';
    endDate: Date;
    weekDays: number[];
    completedDates: string[];
    includeWeekends: boolean;
  }>({ enabled: false, type: 'daily', endDate: new Date(), weekDays: [], completedDates: [], includeWeekends: true });

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

  // Abrir modal de edição
  const handleActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setEditData({
      title: activity.title,
      description: activity.description?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim() || '',
      status: activity.status,
      assignedTo: activity.assignedTo,
      selectedUsers: activity.assignedUsers || [activity.assignedTo],
      clientId: activity.clientId,
      date: new Date(activity.date),
    });
    const meta = parseRecurrence(activity);
    setRecurrenceEdit({
      enabled: !!(activity.isRecurring || meta.type),
      type: (activity.recurrenceType || meta.type || 'daily') as 'daily' | 'weekly',
      endDate: meta.endDate || new Date(),
      weekDays: meta.weekDays || [],
      completedDates: meta.completedDates || [],
      includeWeekends: (meta as any).includeWeekends !== false,
    });
  };

  // Salvar edição
  const handleSaveEdit = () => {
    if (!editingActivity || !onUpdateActivity) return;
    
    // construir metadados de recorrência se habilitado
    let recurrenceBlock = '';
    if (recurrenceEdit.enabled) {
      const meta: any = {
        type: recurrenceEdit.type,
        endDate: format(recurrenceEdit.endDate, 'yyyy-MM-dd'),
        weekDays: recurrenceEdit.type === 'weekly' ? recurrenceEdit.weekDays : undefined,
        completedDates: recurrenceEdit.completedDates,
        includeWeekends: recurrenceEdit.type === 'daily' ? recurrenceEdit.includeWeekends : undefined,
      };
      recurrenceBlock = `\n<recurrence>${JSON.stringify(meta)}</recurrence>`;
    }
    const cleanOrig = editData.description?.trim() || '';
    
    // Verificar se pode mudar status hoje
    let finalStatus: Activity['status'] = editData.status;
    if (recurrenceEdit.enabled) {
      const todayWeekday = new Date().getDay();
      if (recurrenceEdit.type === 'weekly') {
        const weekDays = recurrenceEdit.weekDays && recurrenceEdit.weekDays.length
          ? recurrenceEdit.weekDays
          : [new Date(editingActivity.date).getDay()];
        const canChange = weekDays.includes(todayWeekday);
        if (!canChange) finalStatus = editingActivity.status; // mantém
      }
    }
    
    // 🎉 Disparar confetes se status mudou para 'completed'
    const wasCompleted = editingActivity.status === 'completed';
    const isNowCompleted = finalStatus === 'completed';
    if (!wasCompleted && isNowCompleted) {
      fireConfetti();
    }
    
    onUpdateActivity(editingActivity.id, {
      title: editData.title,
      description: `${cleanOrig}${recurrenceBlock}`.trim(),
      status: finalStatus,
      assignedTo: editData.assignedTo,
      assignedUsers: editData.selectedUsers,
      isRecurring: recurrenceEdit.enabled,
      recurrenceType: recurrenceEdit.enabled ? recurrenceEdit.type : undefined,
      clientId: editData.clientId,
      date: editData.date,
    });
    
    setEditingActivity(null);
  };

  const getActivitiesForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0,0,0,0);

    return activities.filter(activity => {
      // Filtrar apenas atividades atribuídas ao usuário atual
      const isAssignedToCurrentUser = activity.assignedUsers?.includes(currentUser) || 
                                       activity.assignedTo === currentUser;
      if (!isAssignedToCurrentUser) return false;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-6 border-b bg-muted/30 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
          <div className="flex flex-col flex-1 sm:flex-initial">
            <h2 className="text-lg md:text-2xl font-bold truncate">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                : `Semana de ${format(periodStart, 'dd/MM', { locale: ptBR })} a ${format(periodEnd, 'dd/MM', { locale: ptBR })}`}
            </h2>
            <div className="mt-1 inline-flex items-center gap-2">
              <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Semana</Button>
              <Button size="sm" variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Mês</Button>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
        
        <Button onClick={onCreateActivity} className="gap-2 w-full sm:w-auto" size="sm">
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Nova Atividade</span>
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
          <div key={day} className="p-2 md:p-3 text-center font-medium text-xs md:text-sm">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
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
                'border-r border-b p-1 md:p-2',
                view === 'month' && 'min-h-[80px] md:min-h-[120px] overflow-y-auto',
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
                'font-medium text-xs md:text-sm mb-1 md:mb-2 flex items-center justify-center rounded-full',
                view === 'month' ? 'w-5 h-5 md:w-6 md:h-6' : 'w-5 h-5',
                isToday(day) && 'bg-primary text-primary-foreground'
              )}>
                {format(day, 'd')}
              </div>

              {/* Activities */}
              <div className={cn('space-y-1', view === 'week' && 'space-y-2')}
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
                        'cursor-pointer rounded bg-card hover:bg-primary/10 flex border border-muted text-xs md:text-sm',
                        view === 'week' ? 'px-2 py-1 md:py-2 flex-col gap-1' : 'px-1 md:px-2 py-0.5 md:py-1 items-center gap-1 md:gap-2'
                      )}
                      title={activity.title}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleActivityClick(activity);
                      }}
                      draggable={!activity.isRecurring}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', activity.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      {view === 'week' ? (
                        <>
                          <div className="flex items-center gap-1 md:gap-2">
                            <span
                              className="inline-block w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0"
                              style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                              aria-hidden
                            />
                            <span className="truncate font-semibold text-xs md:text-sm flex-1">{activity.title}</span>
                            {isCompletedOccurrence && <span className="text-xs md:text-sm">✔️</span>}
                          </div>
                          <span className="text-xs text-muted-foreground pl-3 md:pl-5">{client.name}</span>
                        </>
                      ) : (
                        <>
                          <span
                            className="inline-block w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                            aria-hidden
                          />
                          <span className="truncate font-medium text-xs flex-1">{activity.title}</span>
                          <span className="text-xs">{isCompletedOccurrence ? '✔️' : ''}</span>
                        </>
                      )}
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

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Editar Atividade</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <>
              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Grid de duas colunas - responsivo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coluna Esquerda - Apenas Título e Descrição */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input 
                      value={editData.title} 
                      onChange={(e) => setEditData(prev => ({...prev, title: e.target.value}))} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <RichTextEditor
                      content={editData.description}
                      onChange={(html) => setEditData(prev => ({...prev, description: html}))}
                      placeholder="Descreva a atividade com detalhes, checklists, listas..."
                    />
                  </div>
                </div>
                
                {/* Coluna Direita - Todos os outros campos */}
                <div className="space-y-4">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">Cliente</Label>
                    <Select 
                      value={editData.clientId} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, clientId: value }))}
                    >
                      <SelectTrigger id="edit-client">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.filter(c => c.isActive).map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Data */}
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(editData.date, 'dd/MM/yyyy', { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={editData.date}
                          onSelect={(date) => date && setEditData(prev => ({...prev, date: date}))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Responsável Principal */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-assignee">Responsável Principal</Label>
                    <Select 
                      value={editData.assignedTo} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, assignedTo: value }))}
                    >
                      <SelectTrigger id="edit-assignee">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Recorrência */}
                  <div className="space-y-3 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <Label>Recorrência</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="editRecurrenceToggle">Ativar</Label>
                        <input 
                          id="editRecurrenceToggle" 
                          type="checkbox" 
                          checked={recurrenceEdit.enabled} 
                          onChange={(e) => setRecurrenceEdit(r => ({...r, enabled: e.target.checked}))} 
                        />
                      </div>
                    </div>
                    {recurrenceEdit.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select 
                            value={recurrenceEdit.type} 
                            onValueChange={(v) => setRecurrenceEdit(r => ({...r, type: v as 'daily'|'weekly'}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Diária</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Até</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(recurrenceEdit.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarUI
                                mode="single"
                                selected={recurrenceEdit.endDate}
                                onSelect={(date) => date && setRecurrenceEdit(r => ({...r, endDate: date}))}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {recurrenceEdit.type === 'weekly' && (
                          <div className="space-y-2 col-span-2">
                            <Label>Dias da semana</Label>
                            <div className="grid grid-cols-7 gap-1">
                              {['D','S','T','Q','Q','S','S'].map((d,i) => (
                                <Button 
                                  key={i} 
                                  type="button" 
                                  variant={recurrenceEdit.weekDays.includes(i) ? 'default' : 'outline'} 
                                  className="h-8"
                                  onClick={() => setRecurrenceEdit(r => ({
                                    ...r, 
                                    weekDays: r.weekDays.includes(i) 
                                      ? r.weekDays.filter(x=>x!==i) 
                                      : [...r.weekDays, i]
                                  }))}
                                >
                                  {d}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {recurrenceEdit.type === 'daily' && (
                          <div className="space-y-2 col-span-2 flex items-center gap-2">
                            <input
                              id="editIncludeWeekends"
                              type="checkbox"
                              checked={recurrenceEdit.includeWeekends}
                              onChange={(e) => setRecurrenceEdit(r => ({ ...r, includeWeekends: e.target.checked }))}
                            />
                            <Label htmlFor="editIncludeWeekends" className="cursor-pointer">
                              Incluir finais de semana
                            </Label>
                          </div>
                        )}
                        {recurrenceEdit.completedDates.length > 0 && (
                          <div className="col-span-2 text-xs text-muted-foreground">
                            Ocorrências concluídas: {recurrenceEdit.completedDates.length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Seleção de Usuários */}
                  <div className="space-y-3 border rounded-md p-3">
                    <Label>Usuários que podem ver esta atividade</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center gap-2">
                          <input
                            id={`edit-user-${user.id}`}
                            type="checkbox"
                            checked={editData.selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditData(prev => ({
                                  ...prev,
                                  selectedUsers: [...prev.selectedUsers, user.id]
                                }));
                              } else {
                                setEditData(prev => ({
                                  ...prev,
                                  selectedUsers: prev.selectedUsers.filter(id => id !== user.id)
                                }));
                              }
                            }}
                            className="cursor-pointer"
                          />
                          <Label htmlFor={`edit-user-${user.id}`} className="cursor-pointer font-normal">
                            {user.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {editData.selectedUsers.length === 0 && (
                      <p className="text-xs text-destructive">Selecione pelo menos um usuário</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status Atual</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => {
                        const isActive = editData.status === value;
                        return (
                          <Badge
                            key={value}
                            variant={isActive ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-all',
                              isActive && 'ring-2 ring-primary'
                            )}
                            onClick={() => setEditData(prev => ({...prev, status: value as Activity['status']}))}
                          >
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>
              
              {/* Rodapé fixo com botões */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
                <Button variant="outline" onClick={() => setEditingActivity(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  Salvar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}