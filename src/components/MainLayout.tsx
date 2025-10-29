import { useState } from 'react';
import { User } from '@/types';
import { Calendar } from './Calendar';
import { ActivityManager } from './ActivityManager';
import { ClientManager } from './ClientManager';
import { ClientLegend } from './ClientLegend';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Calendar as CalendarIcon, Activity, Users } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useClients } from '@/hooks/useClients';
import { useTimers } from '@/hooks/useTimers';


interface MainLayoutProps {
  currentUser: User;
  onLogout: () => void;
  activitiesHook: ReturnType<typeof import("@/hooks/useActivities").useActivities>;
  clientsHook: ReturnType<typeof import("@/hooks/useClients").useClients>;
  timersHook: ReturnType<typeof import("@/hooks/useTimers").useTimers>;
}


export function MainLayout({ currentUser, onLogout, activitiesHook, clientsHook, timersHook }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Função para abrir o formulário e trocar para a aba de atividades
  const handleOpenCreateActivity = () => {
    setActiveTab('activities');
    setShowCreateActivity(true);
  };

  const handleCalendarActivityClick = (id: string) => {
    setSelectedActivityId(id);
    setActiveTab('activities');
  };

  const handleDayCreate = (date: Date) => {
    // Abrir aba de atividades com o formulário de criação
    setActiveTab('activities');
    setShowCreateActivity(true);
  setCreateDate(date);
    // Poderíamos armazenar data pré-selecionada em estado global/contexto; por ora ActivityManager já inicia com hoje.
    // Extensão futura: passar via algum store ou prop.
  };

  // Hooks vindos do App
  const {
    activities,
    createActivity,
    updateActivity,
    deleteActivity,
    updateActivityStatus
  } = activitiesHook;

  const {
    clients,
    createClient,
    updateClient,
    deleteClient
  } = clientsHook;

  const {
    activeTimers,
    startTimer,
    stopTimer
  } = timersHook;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gestão de Atividades - GEST Empresarial</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo, {currentUser.name}
              </p>
            </div>
          </div>
          
          <Button onClick={onLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
  <aside className="w-72 border-r bg-card p-4 overflow-y-auto">
          <ClientLegend clients={clients} />
        </aside>

        {/* Content Area */}
  <main className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-6 mt-6">
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-2">
                <Activity className="w-4 h-4" />
                Atividades
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Users className="w-4 h-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-6">
              <TabsContent value="calendar" className="h-full m-0">
                <Calendar
                  activities={activities}
                  clients={clients}
                  currentUser={currentUser.id}
                  onStatusChange={updateActivityStatus}
                  onStartTimer={startTimer}
                  onStopTimer={stopTimer}
                  activeTimers={activeTimers}
                  onCreateActivity={handleOpenCreateActivity}
                  onUpdateActivity={updateActivity}
                  onActivityClick={handleCalendarActivityClick}
                  onDayCreate={handleDayCreate}
                />
              </TabsContent>

              <TabsContent value="activities" className="h-full m-0 p-6">
                <ActivityManager
                  activities={activities}
                  clients={clients}
                  currentUser={currentUser}
                  onCreateActivity={createActivity}
                  onUpdateActivity={updateActivity}
                  onDeleteActivity={deleteActivity}
                  onStatusChange={updateActivityStatus}
                  showCreateForm={showCreateActivity}
                  onCloseCreateForm={() => setShowCreateActivity(false)}
                  onOpenCreateForm={() => setShowCreateActivity(true)}
                  createDate={createDate}
                  onConsumeCreateDate={() => setCreateDate(null)}
                  selectedActivityId={selectedActivityId}
                  onClearSelectedActivity={() => setSelectedActivityId(null)}
                  onSelectActivity={(id) => setSelectedActivityId(id)}
                />
              </TabsContent>

              <TabsContent value="clients" className="h-full m-0 p-6">
                <ClientManager
                  clients={clients}
                  onCreateClient={createClient}
                  onUpdateClient={updateClient}
                  onDeleteClient={deleteClient}
                />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}