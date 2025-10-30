
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { UserLogin } from '@/components/UserLogin';
import { MainLayout } from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';


// Recebe hooks como props
interface IndexProps {
  activitiesHook: ReturnType<typeof import("@/hooks/useActivities").useActivities>;
  clientsHook: ReturnType<typeof import("@/hooks/useClients").useClients>;
  timersHook: ReturnType<typeof import("@/hooks/useTimers").useTimers>;
}

const Index = ({ activitiesHook, clientsHook, timersHook }: IndexProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      const formattedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.name,
        createdAt: new Date(user.created_at)
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleCreateUser = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{ name }])
        .select()
        .single();
      
      if (error) throw error;
      const newUser = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at)
      };
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <UserLogin
        users={users}
        onLogin={handleLogin}
        onCreateUser={handleCreateUser}
      />
    );
  }

  return (
    <MainLayout
      currentUser={currentUser}
      users={users}
      onLogout={handleLogout}
      activitiesHook={activitiesHook}
      clientsHook={clientsHook}
      timersHook={timersHook}
    />
  );
};

export default Index;
