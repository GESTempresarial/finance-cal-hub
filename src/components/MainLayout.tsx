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
}

export function MainLayout({ currentUser, onLogout }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('calendar');
  
  const {
    activities,
    createActivity,
    updateActivity,
    deleteActivity,
    updateActivityStatus
  } = useActivities();

  const {
    clients,
    createClient,
    updateClient,
    deleteClient
  } = useClients();

  const {
    activeTimers,
    startTimer,
    stopTimer
  } = useTimers();

  const [showCreateActivity, setShowCreateActivity] = useState(false);

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
              <h1 className="text-xl font-bold">Sistema BPO Financeiro</h1>
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
        <aside className="w-80 border-r bg-card p-4 overflow-y-auto">
          <ClientLegend clients={clients} />
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
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
                  onCreateActivity={() => setShowCreateActivity(true)}
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