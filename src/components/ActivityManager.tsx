import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Client, User, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityManagerProps {
  activities: Activity[];
  clients: Client[];
  currentUser: User;
  onCreateActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (id: string) => void;
  onStatusChange: (id: string, status: Activity['status']) => void;
  showCreateForm?: boolean;
  onCloseCreateForm?: () => void;
  onOpenCreateForm?: () => void;
  selectedActivityId?: string | null;
  onClearSelectedActivity?: () => void;
  createDate?: Date | null;
  onConsumeCreateDate?: () => void;
  onSelectActivity?: (id: string) => void;
}

export function ActivityManager({
  activities,
  clients,
  currentUser,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  onStatusChange,
  showCreateForm = false,
  onCloseCreateForm,
  onOpenCreateForm,
  selectedActivityId,
  onClearSelectedActivity,
  createDate,
  onConsumeCreateDate,
  onSelectActivity,
}: ActivityManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  
  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    assigneeId: currentUser.id,
    dueDate: new Date(),
    estimatedMinutes: 60,
    isRecurring: false,
    recurrenceType: 'daily' as 'daily' | 'weekly',
    endDate: new Date(),
    weekDays: [] as number[], // 0-6 (Sunday-Saturday)
    includeWeekends: true, // nova flag para recorrências diárias
  });

  // Se veio uma data do calendário, aplicar uma única vez
  useEffect(() => {
    if (createDate) {
      setFormData(prev => ({ ...prev, dueDate: createDate }));
      onConsumeCreateDate?.();
    }
  }, [createDate]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesClient = clientFilter === 'all' || activity.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Parse metadados de recorrência (mesma lógica utilizada no calendário)
  const parseRecurrence = (activity: Activity): { type?: 'daily'|'weekly'; endDate?: Date; weekDays?: number[]; completedDates?: string[]; includeWeekends?: boolean } => {
    const result: { type?: 'daily'|'weekly'; endDate?: Date; weekDays?: number[]; completedDates?: string[]; includeWeekends?: boolean } = {};
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

  // Separar hoje e outras
  const today = new Date();
  today.setHours(0,0,0,0);
  const { todayActivities, otherActivities } = useMemo(() => {
    const todayList: Activity[] = [];
    const others: Activity[] = [];
    filteredActivities.forEach(a => {
      const baseDate = new Date(a.date);
      baseDate.setHours(0,0,0,0);

      if (a.isRecurring) {
        const meta = parseRecurrence(a);
        const start = baseDate;
        const end = meta.endDate ? meta.endDate : start;
        end.setHours(0,0,0,0);
        const inRange = today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
        if (inRange) {
          const type = a.recurrenceType || meta.type;
          if (type === 'daily') {
            const includeWeekends = (meta as any).includeWeekends !== false; // default true
            const weekday = today.getDay();
            if (!includeWeekends && (weekday === 0 || weekday === 6)) {
              // pula fim de semana
            } else {
              todayList.push(a);
            }
            return;
          }
          if (type === 'weekly') {
            const weekDays = (meta.weekDays && meta.weekDays.length) ? meta.weekDays : [start.getDay()];
            if (weekDays.includes(today.getDay())) {
              todayList.push(a);
              return;
            }
          }
        }
      }

      // Não recorrente ou recorrente fora de ocorrência do dia
      if (baseDate.getTime() === today.getTime()) todayList.push(a); else others.push(a);
    });
    return { todayActivities: todayList, otherActivities: others };
  }, [filteredActivities]);

  // Scroll até atividade selecionada ao vir do calendário
  const selectedRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedActivityId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedActivityId]);

  // Detalhes/edição da atividade selecionada
  const selectedActivity = useMemo(
    () => activities.find(a => a.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );
  const [editData, setEditData] = useState<{title: string; description?: string; status: Activity['status']}>({
    title: '', description: '', status: 'pending'
  });
  const [recurrenceEdit, setRecurrenceEdit] = useState<{
    enabled: boolean;
    type: 'daily' | 'weekly';
    endDate: Date;
    weekDays: number[];
    completedDates: string[];
    includeWeekends: boolean;
  }>({ enabled: false, type: 'daily', endDate: new Date(), weekDays: [], completedDates: [], includeWeekends: true });
  useEffect(() => {
    if (selectedActivity) {
      setEditData({
        title: selectedActivity.title,
        description: selectedActivity.description?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim() || '',
        status: selectedActivity.status,
      });
      const meta = parseRecurrence(selectedActivity);
      setRecurrenceEdit({
        enabled: !!(selectedActivity.isRecurring || meta.type),
        type: (selectedActivity.recurrenceType || meta.type || 'daily') as 'daily' | 'weekly',
        endDate: meta.endDate || new Date(),
        weekDays: meta.weekDays || [],
        completedDates: meta.completedDates || [],
        includeWeekends: (meta as any).includeWeekends !== false,
      });
    }
  }, [selectedActivity]);

  const handleCreateActivity = async () => {
    if (!formData.title.trim() || !formData.clientId) return;

    // Se recorrente, embute metadados na descrição para o calendário renderizar ocorrências
    let description = formData.description;
    if (formData.isRecurring) {
      const recurMeta = {
        type: formData.recurrenceType,
        endDate: format(formData.endDate, 'yyyy-MM-dd'),
        weekDays: formData.recurrenceType === 'weekly' ? formData.weekDays : undefined,
        includeWeekends: formData.recurrenceType === 'daily' ? formData.includeWeekends : undefined,
      };
      description = `${description || ''}\n<recurrence>${JSON.stringify(recurMeta)}</recurrence>`;
    }

    await onCreateActivity({
      title: formData.title,
      description,
      clientId: formData.clientId,
      assignedTo: formData.assigneeId,
      assignedToName: currentUser.name,
      clientName: clients.find(c => c.id === formData.clientId)?.name || '',
      date: formData.dueDate,
      estimatedDuration: formData.estimatedMinutes,
      status: 'pending',
      isRecurring: formData.isRecurring,
      recurrenceType: formData.isRecurring ? formData.recurrenceType : undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      clientId: '',
      assigneeId: currentUser.id,
      dueDate: new Date(),
      estimatedMinutes: 60,
      isRecurring: false,
      recurrenceType: 'daily',
      endDate: new Date(),
      weekDays: [],
      includeWeekends: true,
    });

    onCloseCreateForm?.();
  };

  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Atividades</h2>
          <p className="text-muted-foreground">
            {filteredActivities.length} atividades encontradas
          </p>
        </div>
  <Button onClick={() => onOpenCreateForm?.()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar atividades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients.filter(c => c.isActive).map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="grid gap-6">
        {/* Hoje */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Hoje</h3>
          <div className="grid gap-4">
            {todayActivities.map((activity) => {
              const client = getClientById(activity.clientId);
              if (!client) return null;

              const isSelected = selectedActivityId === activity.id;
              return (
                <Card key={activity.id} className={cn('p-4 transition cursor-pointer hover:bg-muted/40', isSelected ? 'ring-2 ring-primary' : '')} ref={isSelected ? selectedRef : undefined}
                  onClick={() => onSelectActivity?.(activity.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{activity.title}</h3>
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {client.name}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {!activity.isRecurring ? (
                          <span>📅 {format(new Date(activity.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        ) : (
                          (() => {
                            const match = activity.description?.match(/<recurrence>(.*?)<\/recurrence>/);
                            const meta = match ? JSON.parse(match[1]) : undefined;
                            if (meta?.endDate) {
                              const [y,m,d] = String(meta.endDate).split('-').map(Number);
                              const end = (y && m && d) ? new Date(y, m-1, d) : new Date(meta.endDate);
                              return <span>↔️ até {format(end, 'dd/MM/yyyy', { locale: ptBR })}</span>;
                            }
                            return null;
                          })()
                        )}
                        <span>⏱️ {activity.estimatedDuration} min</span>
                        {activity.actualDuration && (
                          <span>✅ {activity.actualDuration} min real</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Select de status */}
                      <Select value={activity.status} onValueChange={(v) => {
                        const newStatus = v as Activity['status'];
                        if (newStatus === 'completed' && activity.isRecurring) {
                          const today = new Date();
                          const todayStr = format(today, 'yyyy-MM-dd');
                          const weekday = today.getDay(); // 0=Dom .. 6=Sab
                          const match = activity.description?.match(/<recurrence>(.*?)<\/recurrence>/);
                          let meta: any = match ? JSON.parse(match[1]) : {};
                          meta.type = meta.type || activity.recurrenceType || 'daily';
                          // Validar se hoje é uma ocorrência legítima
                          let isOccurrence = false;
                          if (meta.type === 'daily') {
                            const includeWeekends = meta.includeWeekends !== false;
                            if (!includeWeekends && (weekday === 0 || weekday === 6)) {
                              isOccurrence = false;
                            } else {
                              isOccurrence = true;
                            }
                          } else if (meta.type === 'weekly') {
                            const wds = Array.isArray(meta.weekDays) && meta.weekDays.length ? meta.weekDays : [new Date(activity.date).getDay()];
                            isOccurrence = wds.includes(weekday);
                          }
                          meta.completedDates = Array.isArray(meta.completedDates) ? meta.completedDates : [];
                          if (isOccurrence && !meta.completedDates.includes(todayStr)) meta.completedDates.push(todayStr);
                          const newDesc = `${(activity.description || '').replace(/<recurrence>(.*?)<\/recurrence>/, '')}`.trim();
                          const descWithMeta = `${newDesc}\n<recurrence>${JSON.stringify(meta)}</recurrence>`;
                          onUpdateActivity(activity.id, { description: descWithMeta });
                        }
                        onStatusChange(activity.id, newStatus);
                      }}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })}
            {todayActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem atividades para hoje.</p>
            )}
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* Outras */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Outras atividades</h3>
          <div className="grid gap-4">
            {otherActivities.map((activity) => {
              const client = getClientById(activity.clientId);
              if (!client) return null;

              // Verificar se recorrente pode ser alterada hoje
              let canChangeStatus = true;
              if (activity.isRecurring) {
                const meta = parseRecurrence(activity);
                const todayWeekday = today.getDay();
                const type = activity.recurrenceType || meta.type;
                if (type === 'weekly') {
                  const baseDate = new Date(activity.date); baseDate.setHours(0,0,0,0);
                  const weekDays = (meta.weekDays && meta.weekDays.length) ? meta.weekDays : [baseDate.getDay()];
                  canChangeStatus = weekDays.includes(todayWeekday); // só habilita se hoje for ocorrência
                }
                // daily nunca cai em outras, então não tratamos
              }

              return (
                <Card key={activity.id} className="p-4 transition cursor-pointer hover:bg-muted/40" onClick={() => onSelectActivity?.(activity.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{activity.title}</h3>
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {client.name}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📅 {format(new Date(activity.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>⏱️ {activity.estimatedDuration} min</span>
                        {activity.actualDuration && (
                          <span>✅ {activity.actualDuration} min real</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Select value={activity.status} onValueChange={(v) => {
                        if (!canChangeStatus) return; // proteção extra
                        const newStatus = v as Activity['status'];
                        if (newStatus === 'completed' && activity.isRecurring) {
                          const today = new Date();
                          const todayStr = format(today, 'yyyy-MM-dd');
                          const weekday = today.getDay();
                          const match = activity.description?.match(/<recurrence>(.*?)<\/recurrence>/);
                          let meta: any = match ? JSON.parse(match[1]) : {};
                          meta.type = meta.type || activity.recurrenceType || 'daily';
                          let isOccurrence = false;
                          if (meta.type === 'daily') {
                            const includeWeekends = meta.includeWeekends !== false;
                            if (!includeWeekends && (weekday === 0 || weekday === 6)) {
                              isOccurrence = false;
                            } else {
                              isOccurrence = true;
                            }
                          } else if (meta.type === 'weekly') {
                            const wds = Array.isArray(meta.weekDays) && meta.weekDays.length ? meta.weekDays : [new Date(activity.date).getDay()];
                            isOccurrence = wds.includes(weekday);
                          }
                          meta.completedDates = Array.isArray(meta.completedDates) ? meta.completedDates : [];
                          if (isOccurrence && !meta.completedDates.includes(todayStr)) meta.completedDates.push(todayStr);
                          const newDesc = `${(activity.description || '').replace(/<recurrence>(.*?)<\/recurrence>/, '')}`.trim();
                          const descWithMeta = `${newDesc}\n<recurrence>${JSON.stringify(meta)}</recurrence>`;
                          onUpdateActivity(activity.id, { description: descWithMeta });
                        }
                        onStatusChange(activity.id, newStatus);
                      }}>
                        <SelectTrigger className="w-48" disabled={!canChangeStatus} title={!canChangeStatus ? 'Status só pode ser alterado no dia da ocorrência' : undefined}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })}
            {otherActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem outras atividades.</p>
            )}
          </div>
        </div>
      </div>


      {/* Create Activity Dialog */}
      <Dialog open={showCreateForm} onOpenChange={onCloseCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Digite o título da atividade"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client">Cliente*</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.isActive).map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva a atividade..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, dueDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedMinutes">Tempo Estimado (min)</Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  value={formData.estimatedMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedMinutes: Number(e.target.value) }))}
                  min="1"
                />
              </div>
            </div>

            {/* Recorrência */}
            <div className="space-y-3 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <Label>Recorrência</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isRecurring">Ativar</Label>
                  <input
                    id="isRecurring"
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                </div>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formData.recurrenceType} onValueChange={(v) => setFormData(prev => ({ ...prev, recurrenceType: v as 'daily' | 'weekly' }))}>
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
                          {format(formData.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {formData.recurrenceType === 'weekly' && (
                    <div className="space-y-2 col-span-2">
                      <Label>Dias da semana</Label>
                      <div className="grid grid-cols-7 gap-1">
                        {['D','S','T','Q','Q','S','S'].map((d, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant={formData.weekDays.includes(i) ? 'default' : 'outline'}
                            className="h-8"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              weekDays: prev.weekDays.includes(i)
                                ? prev.weekDays.filter(x => x !== i)
                                : [...prev.weekDays, i]
                            }))}
                          >
                            {d}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.isRecurring && formData.recurrenceType === 'daily' && (
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        id="includeWeekends"
                        type="checkbox"
                        checked={formData.includeWeekends}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeWeekends: e.target.checked }))}
                      />
                      <Label htmlFor="includeWeekends" className="cursor-pointer">Incluir finais de semana</Label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onCloseCreateForm}>
                Cancelar
              </Button>
              <Button onClick={handleCreateActivity}>
                Criar Atividade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Activity Details Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={onClearSelectedActivity}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Atividade</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editData.title} onChange={(e) => setEditData(prev => ({...prev, title: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={3} value={editData.description} onChange={(e) => setEditData(prev => ({...prev, description: e.target.value}))} />
              </div>
              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label>Recorrência</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor="editRecurrenceToggle">Ativar</Label>
                    <input id="editRecurrenceToggle" type="checkbox" checked={recurrenceEdit.enabled} onChange={(e) => setRecurrenceEdit(r => ({...r, enabled: e.target.checked}))} />
                  </div>
                </div>
                {recurrenceEdit.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={recurrenceEdit.type} onValueChange={(v) => setRecurrenceEdit(r => ({...r, type: v as 'daily'|'weekly'}))}>
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
                          <Calendar
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
                            <Button key={i} type="button" variant={recurrenceEdit.weekDays.includes(i) ? 'default' : 'outline'} className="h-8"
                              onClick={() => setRecurrenceEdit(r => ({...r, weekDays: r.weekDays.includes(i) ? r.weekDays.filter(x=>x!==i) : [...r.weekDays, i]}))}
                            >{d}</Button>
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
                        <Label htmlFor="editIncludeWeekends" className="cursor-pointer">Incluir finais de semana</Label>
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
              <div className="space-y-2">
                <Label>Status</Label>
                {(() => {
                  // determinar se pode mudar status nesta modal
                  let canChange = true;
                  if (recurrenceEdit.enabled) {
                    const todayWeekday = new Date().getDay();
                    if (recurrenceEdit.type === 'weekly') {
                      const weekDays = recurrenceEdit.weekDays && recurrenceEdit.weekDays.length
                        ? recurrenceEdit.weekDays
                        : [new Date(selectedActivity.date).getDay()];
                      canChange = weekDays.includes(todayWeekday);
                    }
                    // daily sempre pode
                  }
                  return (
                    <>
                      <Select value={editData.status} onValueChange={(v) => canChange && setEditData(prev => ({...prev, status: v as Activity['status']}))}>
                        <SelectTrigger disabled={!canChange} title={!canChange ? 'Status só pode ser alterado no dia da ocorrência' : undefined}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!canChange && (
                        <p className="text-xs text-muted-foreground">Só é possível alterar o status no dia configurado da recorrência.</p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={() => { if (selectedActivity) { onDeleteActivity(selectedActivity.id); onClearSelectedActivity?.(); } }}>Excluir</Button>
                <Button onClick={() => {
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
                  // Se não pode mudar status hoje, preserva status atual original
                  let finalStatus: Activity['status'] = editData.status;
                  if (recurrenceEdit.enabled) {
                    const todayWeekday = new Date().getDay();
                    if (recurrenceEdit.type === 'weekly') {
                      const weekDays = recurrenceEdit.weekDays && recurrenceEdit.weekDays.length
                        ? recurrenceEdit.weekDays
                        : [new Date(selectedActivity.date).getDay()];
                      const canChange = weekDays.includes(todayWeekday);
                      if (!canChange) finalStatus = selectedActivity.status; // mantém
                    }
                  }
                  onUpdateActivity(selectedActivity.id, {
                    title: editData.title,
                    description: `${cleanOrig}${recurrenceBlock}`.trim(),
                    status: finalStatus,
                    isRecurring: recurrenceEdit.enabled,
                    recurrenceType: recurrenceEdit.enabled ? recurrenceEdit.type : undefined,
                  });
                  onClearSelectedActivity?.();
                }}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}