import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
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
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: clientData.name,
          color_index: clientData.colorIndex,
          is_active: clientData.isActive
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
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updates.name,
          color_index: updates.colorIndex,
          is_active: updates.isActive
        })
        .eq('id', id);
      
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
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);
      
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
  };
}