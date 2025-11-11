import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import { Session } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        if (!currentSession) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (!currentSession) {
        navigate('/auth');
      } else {
        fetchUsers();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
        phone: user.phone,
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

  const handleCreateUser = async (name: string, phone: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{ name, phone }])
        .select()
        .single();
      
      if (error) throw error;
      const newUser = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        createdAt: new Date(data.created_at)
      };
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    navigate('/auth');
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
