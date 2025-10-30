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
import { Plus, Calendar as CalendarIcon, Filter, Search, Play, Pause, CheckCircle, Clock, Users, UserX, Edit, Trash2, RotateCcw, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/lib/confetti';

interface ActivityManagerProps {
  activities: Activity[];
  clients: Client[];
  currentUser: User;
  users: User[];
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
  timersHook?: {
    activeTimers: Map<string, number>;
    runningActivityId: string | null;
    startTimer: (activityId: string) => void;
    pauseTimer: (activityId: string) => void;
    stopTimer: (activityId: string) => void;
    getTimerSeconds: (activityId: string) => number;
    isTimerRunning: (activityId: string) => boolean;
    formatTimer: (seconds: number) => string;
  };
}

export function ActivityManager({
  activities,
  clients,
  currentUser,
  users,
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
  timersHook,
}: ActivityManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [showRecurring, setShowRecurring] = useState(false); // Estado para mostrar/ocultar recorrentes
  
  // Refs para PiP
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipAnimationRef = useRef<number>();
  const pipActivityIdRef = useRef<string | null>(null);
  
  // Usar timer do hook global ou fallback para timer local
  const activeTimers = timersHook?.activeTimers || new Map<string, number>();
  const startActivityTimer = (activityId: string) => {
    onStatusChange(activityId, 'doing');
    if (timersHook) {
      timersHook.startTimer(activityId);
    }
  };
  
  const pauseActivityTimer = (activityId: string) => {
    if (timersHook) {
      timersHook.pauseTimer(activityId);
    }
  };
  
  const isTimerRunning = (activityId: string): boolean => {
    return timersHook?.isTimerRunning(activityId) || false;
  };
  
  const formatTimer = (seconds: number): string => {
    return timersHook?.formatTimer(seconds) || '0:00';
  };
  
  // Abrir Picture-in-Picture diretamente
  const openPictureInPicture = async (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const client = clients.find(c => c.id === activity.clientId);
    if (!client) return;

    try {
      // Criar canvas e video se não existirem
      if (!pipCanvasRef.current) {
        pipCanvasRef.current = document.createElement('canvas');
        pipCanvasRef.current.width = 400;
        pipCanvasRef.current.height = 240;
      }
      
      if (!pipVideoRef.current) {
        pipVideoRef.current = document.createElement('video');
        pipVideoRef.current.muted = true;
      }

      const canvas = pipCanvasRef.current;
      const video = pipVideoRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      pipActivityIdRef.current = activityId;

      // Função para desenhar no canvas
      const drawTimer = () => {
        if (pipActivityIdRef.current !== activityId) return;
        
        const currentSeconds = activeTimers.get(activityId) || 0;
        const currentIsRunning = isTimerRunning(activityId);

        // Fundo gradiente
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Nome da atividade
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        const title = activity.title.length > 30 ? activity.title.substring(0, 30) + '...' : activity.title;
        ctx.fillText(title, canvas.width / 2, 40);

        // Cliente
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(client.name, canvas.width / 2, 65);

        // Timer
        ctx.font = 'bold 64px monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const timerText = formatTimer(currentSeconds);
        ctx.fillText(timerText, canvas.width / 2, 140);

        // Label
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('TEMPO DECORRIDO', canvas.width / 2, 165);

        // Status
        const statusLabel = currentIsRunning ? '▶ RODANDO' : '⏸ PAUSADO';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = currentIsRunning ? '#22c55e' : '#fbbf24';
        ctx.fillText(statusLabel, canvas.width / 2, 195);

        // Instrução com atalhos
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'left';
        ctx.fillText('Alt + P: Play/Pause', 10, 210);
        ctx.fillText('Alt + F: Finalizar', 10, 225);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Alt + C: Cliente | Alt + T: Equipe | Alt + E: Editar', canvas.width / 2, 225);

        // Continuar animação
        pipAnimationRef.current = requestAnimationFrame(drawTimer);
      };

      // Desenhar inicialmente
      drawTimer();

      // Capturar stream do canvas
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      await video.play();

      // Ativar PiP
      if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();

        // Limpar quando sair do PiP
        video.addEventListener('leavepictureinpicture', () => {
          if (pipAnimationRef.current) {
            cancelAnimationFrame(pipAnimationRef.current);
          }
          pipActivityIdRef.current = null;
        }, { once: true });
      } else {
        alert('Picture-in-Picture não é suportado neste navegador.');
      }
    } catch (error) {
      console.error('Erro ao ativar Picture-in-Picture:', error);
      alert('Erro ao ativar Picture-in-Picture. Certifique-se de que seu navegador suporta esta funcionalidade.');
    }
  };
  
  // Atalhos de teclado globais para controle do timer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!pipActivityIdRef.current) return;
      
      const activityId = pipActivityIdRef.current;
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      // Alt + P: Play/Pausar
      if (e.altKey && e.code === 'KeyP' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (activity.status === 'pending') {
          startActivityTimer(activityId);
        } else if (activity.status === 'doing') {
          if (isTimerRunning(activityId)) {
            pauseActivityTimer(activityId);
          } else {
            startActivityTimer(activityId);
          }
        }
      }
      
      // Alt + F: Finalizar/Concluir
      if (e.altKey && e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        changeActivityStatus(activityId, 'completed');
      }
      
      // Alt + C: Aguardar Cliente
      if (e.altKey && e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        changeActivityStatus(activityId, 'waiting-client');
      }
      
      // Alt + T: Aguardar Equipe
      if (e.altKey && e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        changeActivityStatus(activityId, 'waiting-team');
      }
      
      // Alt + E: Editar
      if (e.altKey && e.code === 'KeyE' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSelectActivity?.(activityId);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activities]);
  
  // Mudar status e parar timer
  const changeActivityStatus = (activityId: string, newStatus: Activity['status']) => {
    pauseActivityTimer(activityId);
    onStatusChange(activityId, newStatus);
    
    // Se concluir, limpar timer e disparar confetes
    if (newStatus === 'completed') {
      const timerSeconds = activeTimers.get(activityId) || 0;
      const actualMinutes = Math.ceil(timerSeconds / 60); // Converter para minutos
      
      // Salvar o tempo real gasto
      onUpdateActivity(activityId, {
        actualDuration: actualMinutes
      });
      
      if (timersHook) {
        timersHook.stopTimer(activityId);
      }
      
      // 🎉 Disparar confetes!
      fireConfetti();
    }
  };
  
  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    assigneeId: currentUser.id,
    selectedUsers: [currentUser.id] as string[], // Usuários selecionados
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
    // Filtrar apenas atividades atribuídas ao usuário atual
    const isAssignedToCurrentUser = activity.assignedUsers?.includes(currentUser.id) || 
                                     activity.assignedTo === currentUser.id;
    if (!isAssignedToCurrentUser) return false;
    
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
  const { todayActivities, otherActivities, recurringActivities } = useMemo(() => {
    const todayList: Activity[] = [];
    const others: Activity[] = [];
    const recurring: Activity[] = [];
    
    filteredActivities.forEach(a => {
      const baseDate = new Date(a.date);
      baseDate.setHours(0,0,0,0);
      
      // Se é recorrente, verificar se tem ocorrência hoje
      if (a.isRecurring) {
        recurring.push(a);
        
        // Verificar se hoje está dentro do período de recorrência
        const meta = parseRecurrence(a);
        const endDate = meta.endDate || baseDate;
        endDate.setHours(0,0,0,0);
        
        if (today >= baseDate && today <= endDate) {
          const type = a.recurrenceType || meta.type;
          let shouldAppearToday = false;
          
          if (type === 'daily') {
            const includeWeekends = (meta as any).includeWeekends !== false;
            const todayWeekday = today.getDay();
            if (includeWeekends || (todayWeekday !== 0 && todayWeekday !== 6)) {
              shouldAppearToday = true;
            }
          } else if (type === 'weekly') {
            const weekDays = (meta.weekDays && meta.weekDays.length) ? meta.weekDays : [baseDate.getDay()];
            if (weekDays.includes(today.getDay())) {
              shouldAppearToday = true;
            }
          }
          
          if (shouldAppearToday) {
            // Criar uma cópia da atividade representando a ocorrência de hoje
            const todayOccurrence = {
              ...a,
              // Manter o ID original mas marcar que é uma ocorrência de hoje
              date: new Date(today)
            };
            todayList.push(todayOccurrence);
          }
        }
        return;
      }
      
      // Não recorrente
      if (baseDate.getTime() === today.getTime()) todayList.push(a); else others.push(a);
    });
    
    return { todayActivities: todayList, otherActivities: others, recurringActivities: recurring };
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
  const [editData, setEditData] = useState<{
    title: string; 
    description?: string; 
    status: Activity['status'];
    assignedTo: string;
    selectedUsers: string[];
  }>({
    title: '', description: '', status: 'pending', assignedTo: '', selectedUsers: []
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
        assignedTo: selectedActivity.assignedTo,
        selectedUsers: selectedActivity.assignedUsers || [selectedActivity.assignedTo],
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
    if (!formData.title.trim() || !formData.clientId || formData.selectedUsers.length === 0) return;

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
      assignedUsers: formData.selectedUsers,
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
      selectedUsers: [currentUser.id],
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
              const isRunning = isTimerRunning(activity.id);
              const timerSeconds = activeTimers.get(activity.id) || 0;
              
              // Verificar se é uma ocorrência de atividade recorrente de hoje
              const isRecurringOccurrence = activity.isRecurring;
              const todayStr = format(today, 'yyyy-MM-dd');
              const meta = parseRecurrence(activity);
              const isCompletedToday = isRecurringOccurrence && meta.completedDates?.includes(todayStr);
              
              // Para atividades recorrentes, o status depende se está concluída hoje OU se está rodando/fazendo
              let displayStatus: Activity['status'];
              if (isRecurringOccurrence) {
                if (isCompletedToday) {
                  displayStatus = 'completed';
                } else if (activity.status === 'doing' || isRunning) {
                  displayStatus = 'doing';
                } else {
                  displayStatus = 'pending';
                }
              } else {
                displayStatus = activity.status;
              }
              
              return (
                <Card 
                  key={activity.id} 
                  className={cn('p-4 transition border-l-4', isSelected ? 'ring-2 ring-primary' : '')} 
                  style={{ borderLeftColor: `hsl(var(--client-${client.colorIndex}))` }}
                  ref={isSelected ? selectedRef : undefined}
                >
                  <div className="space-y-3">
                    {/* Header com título e cliente */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{activity.title}</h3>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {client.name}
                          </span>
                          {isRecurringOccurrence && (
                            <Badge variant="secondary" className="text-xs">
                              ↔️ Recorrente
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {STATUS_LABELS[displayStatus]}
                          </Badge>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">
                            {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Informações e ações */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📅 Hoje</span>
                        <span>⏱️ {activity.estimatedDuration} min estimado</span>
                        {displayStatus === 'completed' && activity.actualDuration && (
                          <span className="text-green-600 font-medium">
                            ✅ {activity.actualDuration} min realizado
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Timer display */}
                        {(displayStatus === 'doing' || isRunning) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm font-mono">
                            <Clock className="w-3 h-3" />
                            {formatTimer(timerSeconds)}
                          </div>
                        )}
                        
                        {/* Botões de ação baseados no status */}
                        {displayStatus === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (isRecurringOccurrence) {
                                // Para recorrentes, atualizar o status para doing
                                onUpdateActivity(activity.id, { status: 'doing' });
                                startActivityTimer(activity.id);
                              } else {
                                startActivityTimer(activity.id);
                              }
                            }}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Iniciar
                          </Button>
                        )}
                        
                        {displayStatus === 'doing' && (
                          <>
                            {isRunning ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => pauseActivityTimer(activity.id)}
                                className="gap-1"
                              >
                                <Pause className="w-3 h-3" />
                                Pausar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startActivityTimer(activity.id)}
                                className="gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Retomar
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                pauseActivityTimer(activity.id);
                                if (!isRecurringOccurrence) {
                                  changeActivityStatus(activity.id, 'waiting-client');
                                } else {
                                  // Para recorrente, atualizar o status mas manter os metadados
                                  onUpdateActivity(activity.id, { status: 'waiting-client' });
                                }
                              }}
                              className="gap-1"
                              title="Aguardando Cliente"
                            >
                              <UserX className="w-3 h-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                pauseActivityTimer(activity.id);
                                if (!isRecurringOccurrence) {
                                  changeActivityStatus(activity.id, 'waiting-team');
                                } else {
                                  // Para recorrente, atualizar o status mas manter os metadados
                                  onUpdateActivity(activity.id, { status: 'waiting-team' });
                                }
                              }}
                              className="gap-1"
                              title="Aguardando Equipe"
                            >
                              <Users className="w-3 h-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                if (isRecurringOccurrence) {
                                  // Marcar esta ocorrência como concluída
                                  pauseActivityTimer(activity.id);
                                  const updatedCompletedDates = [...(meta.completedDates || []), todayStr];
                                  const updatedMeta = {
                                    ...meta,
                                    completedDates: updatedCompletedDates
                                  };
                                  const recurrenceBlock = `\n<recurrence>${JSON.stringify(updatedMeta)}</recurrence>`;
                                  const cleanDesc = activity.description?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim() || '';
                                  
                                  // Calcular e salvar tempo real gasto
                                  const timerSeconds = activeTimers.get(activity.id) || 0;
                                  const actualMinutes = Math.ceil(timerSeconds / 60);
                                  
                                  onUpdateActivity(activity.id, {
                                    description: `${cleanDesc}${recurrenceBlock}`.trim(),
                                    status: 'pending', // Resetar para pending para o próximo dia
                                    actualDuration: actualMinutes
                                  });
                                  
                                  if (timersHook) {
                                    timersHook.stopTimer(activity.id);
                                  }
                                  
                                  fireConfetti();
                                } else {
                                  changeActivityStatus(activity.id, 'completed');
                                }
                              }}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Concluir
                            </Button>
                          </>
                        )}
                        
                        {(displayStatus === 'waiting-client' || displayStatus === 'waiting-team') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (isRecurringOccurrence) {
                                  onUpdateActivity(activity.id, { status: 'doing' });
                                  startActivityTimer(activity.id);
                                } else {
                                  startActivityTimer(activity.id);
                                }
                              }}
                              className="gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Retomar
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                if (isRecurringOccurrence) {
                                  // Marcar esta ocorrência como concluída
                                  pauseActivityTimer(activity.id);
                                  const updatedCompletedDates = [...(meta.completedDates || []), todayStr];
                                  const updatedMeta = {
                                    ...meta,
                                    completedDates: updatedCompletedDates
                                  };
                                  const recurrenceBlock = `\n<recurrence>${JSON.stringify(updatedMeta)}</recurrence>`;
                                  const cleanDesc = activity.description?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim() || '';
                                  onUpdateActivity(activity.id, {
                                    description: `${cleanDesc}${recurrenceBlock}`.trim(),
                                    status: 'pending' // Resetar para pending para o próximo dia
                                  });
                                  fireConfetti();
                                } else {
                                  changeActivityStatus(activity.id, 'completed');
                                }
                              }}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Concluir
                            </Button>
                          </>
                        )}
                        
                        {displayStatus === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (isRecurringOccurrence) {
                                // Remover a data de completedDates e resetar status para pending
                                const updatedCompletedDates = (meta.completedDates || []).filter(d => d !== todayStr);
                                const updatedMeta = {
                                  ...meta,
                                  completedDates: updatedCompletedDates
                                };
                                const recurrenceBlock = `\n<recurrence>${JSON.stringify(updatedMeta)}</recurrence>`;
                                const cleanDesc = activity.description?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim() || '';
                                onUpdateActivity(activity.id, {
                                  description: `${cleanDesc}${recurrenceBlock}`.trim(),
                                  status: 'pending'
                                });
                              } else {
                                changeActivityStatus(activity.id, 'pending');
                              }
                            }}
                            className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                            title="Reverter conclusão"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reabrir
                          </Button>
                        )}
                        
                        {/* Botões de editar e excluir */}
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPictureInPicture(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Abrir Picture-in-Picture"
                          >
                            <Monitor className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectActivity?.(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Editar atividade"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta atividade?')) {
                                pauseActivityTimer(activity.id);
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                            title="Excluir atividade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
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

              return (
                <Card 
                  key={activity.id} 
                  className="p-4 transition border-l-4" 
                  style={{ borderLeftColor: `hsl(var(--client-${client.colorIndex}))` }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
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
                          <p className="text-sm text-muted-foreground">
                            {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📅 {format(new Date(activity.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>⏱️ {activity.estimatedDuration} min estimado</span>
                        {activity.status === 'completed' && activity.actualDuration && (
                          <span className="text-green-600 font-medium">
                            ✅ {activity.actualDuration} min realizado
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {activity.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changeActivityStatus(activity.id, 'pending')}
                            className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                            title="Reverter conclusão"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reabrir
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {STATUS_LABELS[activity.status]}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectActivity?.(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Editar atividade"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta atividade?')) {
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                            title="Excluir atividade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
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
        
        {/* Divisor */}
        <div className="h-px bg-border" />
        
        {/* Atividades Recorrentes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Atividades Recorrentes ({recurringActivities.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecurring(!showRecurring)}
              className="h-8"
            >
              {showRecurring ? '▼ Ocultar' : '▶ Mostrar'}
            </Button>
          </div>
          
          {showRecurring && (
            <div className="grid gap-4">
              {recurringActivities.map((activity) => {
                const client = getClientById(activity.clientId);
                if (!client) return null;
                
                const meta = parseRecurrence(activity);
                const recurrenceInfo = activity.recurrenceType === 'daily' 
                  ? `Diária ${(meta as any).includeWeekends === false ? '(sem finais de semana)' : ''}`
                  : activity.recurrenceType === 'weekly' 
                  ? `Semanal`
                  : 'Recorrente';

                return (
                  <Card key={activity.id} className="p-4 transition border-l-4" 
                    style={{ borderLeftColor: `hsl(var(--client-${client.colorIndex}))` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              ↔️ {recurrenceInfo}
                            </Badge>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {client.name}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground">
                              {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4 pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>📅 Início: {format(new Date(activity.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          {meta.endDate && (
                            <span>🏁 Fim: {format(meta.endDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                          )}
                          <span>⏱️ {activity.estimatedDuration} min</span>
                          {meta.completedDates && meta.completedDates.length > 0 && (
                            <span>✅ {meta.completedDates.length} concluídas</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectActivity?.(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Editar atividade"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta atividade recorrente?')) {
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                            title="Excluir atividade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {recurringActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem atividades recorrentes.</p>
              )}
            </div>
          )}
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

            {/* Responsável Principal */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Responsável Principal*</Label>
              <Select value={formData.assigneeId} onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Seleção de Usuários */}
            <div className="space-y-3 border rounded-md p-3">
              <Label>Atribuir a Usuários (quem verá esta atividade)</Label>
              <div className="grid grid-cols-2 gap-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <input
                      id={`user-${user.id}`}
                      type="checkbox"
                      checked={formData.selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            selectedUsers: [...prev.selectedUsers, user.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selectedUsers: prev.selectedUsers.filter(id => id !== user.id)
                          }));
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor={`user-${user.id}`} className="cursor-pointer font-normal">
                      {user.name}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.selectedUsers.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um usuário</p>
              )}
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
              
              {/* Seleção de Usuários */}
              <div className="space-y-3 border rounded-md p-3">
                <Label>Usuários que podem ver esta atividade</Label>
                <div className="grid grid-cols-2 gap-2">
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
                    assignedTo: editData.assignedTo,
                    assignedUsers: editData.selectedUsers,
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