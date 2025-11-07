import { useState } from 'react';
import { User } from '@/types';
import { Calendar } from './Calendar';
import { ActivityManager } from './ActivityManager';
import { ClientManager } from './ClientManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Calendar as CalendarIcon, Activity, Users } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useClients } from '@/hooks/useClients';
import { useTimers } from '@/hooks/useTimers';


interface MainLayoutProps {
  currentUser: User;
  users: User[];
  onLogout: () => void;
  activitiesHook: ReturnType<typeof import("@/hooks/useActivities").useActivities>;
  clientsHook: ReturnType<typeof import("@/hooks/useClients").useClients>;
  timersHook: ReturnType<typeof import("@/hooks/useTimers").useTimers>;
}


export function MainLayout({ currentUser, users, onLogout, activitiesHook, clientsHook, timersHook }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Função para abrir o formulário de criação a partir do calendário
  const handleOpenCreateActivity = () => {
    setShowCreateActivity(true);
  };

  const handleCalendarActivityClick = (id: string) => {
    setSelectedActivityId(id);
    setActiveTab('activities');
  };

  const handleDayCreate = (date: Date) => {
    // Abrir formulário de criação mantendo a visão atual
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
    runningActivityId,
    timerStateVersion,
    startTimer,
    pauseTimer,
    stopTimer,
    getTimerSeconds,
    isTimerRunning,
    formatTimer,
  } = timersHook;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-background flex flex-col">
      {/* Header with navigation */}
      <header className="border-b bg-card shadow-soft">
        <div className="relative flex flex-wrap items-center justify-between gap-3 md:gap-6 p-4">
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold leading-tight truncate">Gestão de Atividades</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {currentUser.name}
              </p>
            </div>
          </div>

          <div className="order-3 w-full flex justify-center md:order-none md:w-auto md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
            <TabsList className="w-full max-w-lg justify-between gap-1 rounded-full bg-muted/60 p-1 text-xs md:w-auto md:justify-center md:gap-2 md:text-sm">
              <TabsTrigger
                value="calendar"
                className="flex items-center gap-1 md:gap-2 whitespace-nowrap rounded-full px-3 py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
              >
                <CalendarIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Calendário</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="flex items-center gap-1 md:gap-2 whitespace-nowrap rounded-full px-3 py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
              >
                <Activity className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Atividades</span>
                <span className="sm:hidden">Atv</span>
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex items-center gap-1 md:gap-2 whitespace-nowrap rounded-full px-3 py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
              >
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Clientes</span>
                <span className="sm:hidden">Cli</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <Button onClick={onLogout} variant="outline" size="sm" className="order-2 gap-2 shrink-0 md:order-none">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <main className="h-full overflow-auto">
          <div className="h-full flex flex-col mt-2 md:mt-6">
            <TabsContent value="calendar" className="h-full m-0">
              <Calendar
                activities={activities}
                clients={clients}
                currentUser={currentUser.id}
                users={users}
                onStatusChange={updateActivityStatus}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                activeTimers={activeTimers}
                onCreateActivity={handleOpenCreateActivity}
                onUpdateActivity={updateActivity}
                onDeleteActivity={deleteActivity}
                onActivityClick={handleCalendarActivityClick}
                onDayCreate={handleDayCreate}
              />
            </TabsContent>

            <TabsContent value="activities" forceMount className="h-full m-0 p-2 md:p-6 data-[state=inactive]:hidden data-[state=inactive]:pointer-events-none">
              <ActivityManager
                activities={activities}
                clients={clients}
                currentUser={currentUser}
                users={users}
                onCreateActivity={createActivity}
                onCreateClient={createClient}
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
                timersHook={{
                  activeTimers,
                  runningActivityId,
                  timerStateVersion,
                  startTimer,
                  pauseTimer,
                  stopTimer,
                  getTimerSeconds,
                  isTimerRunning,
                  formatTimer,
                }}
              />
            </TabsContent>

            <TabsContent value="clients" className="h-full m-0 p-2 md:p-6">
              <ClientManager
                clients={clients}
                onCreateClient={createClient}
                onUpdateClient={updateClient}
                onDeleteClient={deleteClient}
              />
            </TabsContent>
          </div>
        </main>
      </div>
    </Tabs>
  );
}
