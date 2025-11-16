import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import { Session } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setCompanyContext: setActivitiesCompanyContext } = activitiesHook;
  const { setCompanyContext: setClientsCompanyContext } = clientsHook;

  const fetchUsers = useCallback(async (activeCompanyId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      const formattedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        createdAt: new Date(user.created_at),
        companyId: user.company_id || undefined,
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  }, []);

  const fetchCompanyName = useCallback(async (companyIdValue: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyIdValue)
        .single();

      if (error) throw error;
      setCompanyName(data?.name ?? null);
    } catch (error) {
      console.error('Erro ao buscar nome da empresa:', error);
      setCompanyName(null);
    }
  }, []);

  const loadCompanyContext = useCallback(async (activeSession: Session, options: { showLoader?: boolean } = {}) => {
    const { showLoader = false } = options;
    if (showLoader) {
      setLoading(true);
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', activeSession.user.id)
        .single();

      if (error) throw error;

      if (!profile?.company_id) {
        setCompanyId(null);
        setCompanyName(null);
        setActivitiesCompanyContext(null);
        setClientsCompanyContext(null);
        setUsers([]);
        return;
      }

      setCompanyId(profile.company_id);
      fetchCompanyName(profile.company_id);
      setActivitiesCompanyContext(profile.company_id);
      setClientsCompanyContext(profile.company_id);
      await fetchUsers(profile.company_id);
    } catch (error) {
      console.error('Erro ao carregar empresa do usuário autenticado:', error);
      setCompanyId(null);
      setCompanyName(null);
      setActivitiesCompanyContext(null);
      setClientsCompanyContext(null);
      setUsers([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [fetchUsers, fetchCompanyName, setActivitiesCompanyContext, setClientsCompanyContext]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'SIGNED_OUT' || !currentSession) {
          setSession(null);
          setCompanyId(null);
          setCompanyName(null);
          setUsers([]);
          setActivitiesCompanyContext(null);
          setClientsCompanyContext(null);
          setLoading(false);
          navigate('/auth');
          return;
        }

        if (event === 'SIGNED_IN') {
          setSession(currentSession);
          loadCompanyContext(currentSession, { showLoader: true });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!currentSession) {
        setSession(null);
        setLoading(false);
        navigate('/auth');
      } else {
        setSession(currentSession);
        loadCompanyContext(currentSession, { showLoader: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loadCompanyContext, setActivitiesCompanyContext, setClientsCompanyContext]);

  const handleCreateUser = async (name: string, phone?: string) => {
    if (!companyId) {
      console.error('Não é possível criar usuário sem empresa definida.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{ name: name.trim(), phone: phone?.trim() || null, company_id: companyId }])
        .select()
        .single();
      
      if (error) throw error;
      const newUser: User = {
        id: data.id,
        name: data.name,
        phone: data.phone || undefined,
        createdAt: new Date(data.created_at),
        companyId: data.company_id || undefined,
      };
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  };

  const handleUpdateUser = async (id: string, updates: { name?: string; phone?: string | null }) => {
    if (!companyId) return;
    const payload: { name?: string; phone?: string | null } = {};
    if (typeof updates.name !== 'undefined') {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        console.error('Nome não pode ser vazio.');
        return;
      }
      payload.name = trimmedName;
    }
    if (typeof updates.phone !== 'undefined') {
      payload.phone = updates.phone?.trim() || null;
    }

    if (Object.keys(payload).length === 0) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      setUsers(prev =>
        prev.map(user =>
          user.id === id
            ? {
                ...user,
                name: data.name,
                phone: data.phone || undefined,
              }
            : user
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCompanyId(null);
    setCompanyName(null);
    setUsers([]);
    setActivitiesCompanyContext(null);
    setClientsCompanyContext(null);
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

  return (
    <MainLayout
      users={users}
      onCreateUser={handleCreateUser}
      onUpdateUser={handleUpdateUser}
      onLogout={handleSignOut}
      activitiesHook={activitiesHook}
      clientsHook={clientsHook}
      timersHook={timersHook}
      companyName={companyName}
    />
  );
};

export default Index;
