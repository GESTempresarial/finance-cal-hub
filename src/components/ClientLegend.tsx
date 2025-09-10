import { Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientLegendProps {
  clients: Client[];
}

export function ClientLegend({ clients }: ClientLegendProps) {
  const activeClients = clients.filter(client => client.isActive);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeClients.map((client) => (
          <div key={client.id} className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
            />
            <span className="text-sm font-medium">{client.name}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}