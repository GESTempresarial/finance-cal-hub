import { useState } from 'react';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Building } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onCreateClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}

export function ClientManager({
  clients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
}: ClientManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    colorIndex: 1,
    notes: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      colorIndex: 1,
      notes: '',
      isActive: true,
    });
  };

  const handleCreateClient = () => {
    if (!formData.name.trim()) return;

    // Find next available color
    const usedColors = clients.map(c => c.colorIndex);
    let nextColor = 1;
    while (usedColors.includes(nextColor) && nextColor <= 10) {
      nextColor++;
    }

    onCreateClient({
      name: formData.name,
      colorIndex: nextColor <= 10 ? nextColor : formData.colorIndex,
      notes: formData.notes,
      isActive: formData.isActive,
    });

    resetForm();
    setShowCreateForm(false);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      colorIndex: client.colorIndex,
      notes: client.notes || '',
      isActive: client.isActive,
    });
  };

  const handleUpdateClient = () => {
    if (!editingClient || !formData.name.trim()) return;

    onUpdateClient(editingClient.id, {
      name: formData.name,
      colorIndex: formData.colorIndex,
      notes: formData.notes,
      isActive: formData.isActive,
    });

    resetForm();
    setEditingClient(null);
  };

  const closeDialog = () => {
    setShowCreateForm(false);
    setEditingClient(null);
    resetForm();
  };

  const isDialogOpen = showCreateForm || editingClient !== null;
  const dialogTitle = editingClient ? 'Editar Cliente' : 'Novo Cliente';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Clientes</h2>
          <p className="text-muted-foreground">
            {clients.filter(c => c.isActive).length} clientes ativos
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
                >
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{client.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.isActive ? "default" : "secondary"}>
                      {client.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Cor {client.colorIndex}
                    </span>
                  </div>
                  {client.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {client.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClient(client)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteClient(client.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor de Identificação</Label>
              <Select 
                value={formData.colorIndex.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, colorIndex: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((colorIndex) => (
                    <SelectItem key={colorIndex} value={colorIndex.toString()}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `hsl(var(--client-${colorIndex}))` }}
                        />
                        Cor {colorIndex}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações gerais sobre o cliente..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isActive">Cliente ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={editingClient ? handleUpdateClient : handleCreateClient}>
                {editingClient ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}