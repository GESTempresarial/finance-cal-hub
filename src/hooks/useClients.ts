import { Client } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useClients() {
  const [clients, setClients] = useLocalStorage<Client[]>('bpo-clients', [
    {
      id: '1',
      name: 'Cliente A',
      colorIndex: 1,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: '2', 
      name: 'Cliente B',
      colorIndex: 2,
      isActive: true,
      createdAt: new Date(),
    }
  ]);

  const createClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => 
      prev.map(client => 
        client.id === id 
          ? { ...client, ...updates }
          : client
      )
    );
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
  };

  return {
    clients,
    createClient,
    updateClient,
    deleteClient,
  };
}