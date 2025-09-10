import { useState } from 'react';
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
  });

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesClient = clientFilter === 'all' || activity.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const handleCreateActivity = () => {
    if (!formData.title.trim() || !formData.clientId) return;

    onCreateActivity({
      title: formData.title,
      description: formData.description,
      clientId: formData.clientId,
      assigneeId: formData.assigneeId,
      dueDate: formData.dueDate,
      estimatedMinutes: formData.estimatedMinutes,
      status: 'pending',
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      clientId: '',
      assigneeId: currentUser.id,
      dueDate: new Date(),
      estimatedMinutes: 60,
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
        <Button onClick={() => onCloseCreateForm?.()}>
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
      <div className="grid gap-4">
        {filteredActivities.map((activity) => {
          const client = getClientById(activity.clientId);
          if (!client) return null;

          return (
            <Card key={activity.id} className="p-4">
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
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📅 {format(new Date(activity.dueDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    <span>⏱️ {activity.estimatedMinutes} min</span>
                    {activity.actualMinutes && (
                      <span>✅ {activity.actualMinutes} min real</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {STATUS_LABELS[activity.status]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const statuses: Activity['status'][] = ['pending', 'doing', 'waiting-client', 'waiting-team', 'completed'];
                      const currentIndex = statuses.indexOf(activity.status);
                      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                      onStatusChange(activity.id, nextStatus);
                    }}
                  >
                    Alterar Status
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
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
                <Label>Data de Vencimento</Label>
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
    </div>
  );
}