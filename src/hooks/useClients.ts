import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const setCompanyContext = useCallback((id: string | null) => {
    setCompanyId(id);
    if (!id) {
      setClients([]);
    }
  }, []);

  const fetchClients = useCallback(async (targetCompanyId?: string) => {
    const activeCompanyId = targetCompanyId ?? companyId;
    if (!activeCompanyId) {
      setClients([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      const formattedClients = (data || []).map(client => ({
        id: client.id,
        name: client.name,
        colorIndex: client.color_index,
        isActive: client.is_active,
        createdAt: new Date(client.created_at)
      }));
      setClients(formattedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    if (!companyId) {
      throw new Error('Empresa não definida no contexto');
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: clientData.name,
          color_index: clientData.colorIndex,
          is_active: clientData.isActive,
          company_id: companyId
        }])
        .select()
        .single();
      
      if (error) throw error;
      const newClient = {
        id: data.id,
        name: data.name,
        colorIndex: data.color_index,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      };
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    if (!companyId) {
      throw new Error('Empresa não definida no contexto');
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updates.name,
          color_index: updates.colorIndex,
          is_active: updates.isActive
        })
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      setClients(prev => 
        prev.map(client => 
          client.id === id 
            ? { ...client, ...updates }
            : client
        )
      );
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    if (!companyId) {
      throw new Error('Empresa não definida no contexto');
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };

  return {
    clients,
    createClient,
    updateClient,
    deleteClient,
    setCompanyContext,
    refreshClients: () => fetchClients(),
  };
}
