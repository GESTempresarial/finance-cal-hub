import { useState } from 'react';
import { User } from '@/types';
import { Calendar } from './Calendar';
import { ActivityManager } from './ActivityManager';
import { ClientManager } from './ClientManager';
import { ClientLegend } from './ClientLegend';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Calendar as CalendarIcon, Activity, Users, Menu, X } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useClients } from '@/hooks/useClients';
import { useTimers } from '@/hooks/useTimers';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';


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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Botão de menu mobile */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <ClientLegend clients={clients} />
              </SheetContent>
            </Sheet>
            
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">Gestão de Atividades</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {currentUser.name}
              </p>
            </div>
          </div>
          
          <Button onClick={onLogout} variant="outline" size="sm" className="gap-2 shrink-0">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Desktop only */}
        <aside className="hidden md:block w-72 border-r bg-card p-4 overflow-y-auto">
          <ClientLegend clients={clients} />
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-2 md:mx-6 mt-2 md:mt-6">
              <TabsTrigger value="calendar" className="gap-1 md:gap-2 text-xs md:text-sm">
                <CalendarIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Calendário</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Activity className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Atividades</span>
                <span className="sm:hidden">Atv</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Clientes</span>
                <span className="sm:hidden">Cli</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-2 md:mt-6">
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
                  onActivityClick={handleCalendarActivityClick}
                  onDayCreate={handleDayCreate}
                />
              </TabsContent>

              <TabsContent value="activities" className="h-full m-0 p-2 md:p-6">
                <ActivityManager
                  activities={activities}
                  clients={clients}
                  currentUser={currentUser}
                  users={users}
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
          </Tabs>
        </main>
      </div>
    </div>
  );
}