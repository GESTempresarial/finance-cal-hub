import { useMemo, useState } from 'react';
import { User } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserManagerProps {
  users: User[];
  onCreateUser: (name: string, phone?: string) => void;
  onUpdateUser: (id: string, updates: { name?: string; phone?: string | null }) => void;
}

export function UserManager({ users, onCreateUser, onUpdateUser }: UserManagerProps) {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditPhone(user.phone || '');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditName('');
    setEditPhone('');
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingUserId || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      await onUpdateUser(editingUserId, { name: editName, phone: editPhone });
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setIsSavingEdit(false);
    }
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateUser(newName.trim(), newPhone.trim() || undefined);
    setNewName('');
    setNewPhone('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuários</h2>
          <p className="text-sm text-muted-foreground">
            Edite nomes, telefones ou cadastre novos membros.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuários da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </p>
            )}
            {sortedUsers.map((user) => {
              const isEditing = editingUserId === user.id;
              return (
                <div
                  key={user.id}
                  className="rounded-lg border p-4 flex flex-col gap-3"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          {user.phone && (
                            <p className="text-sm text-muted-foreground">
                              Telefone: {user.phone}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(user)}
                        >
                          Editar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criado em {user.createdAt.toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Nome</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Telefone</Label>
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit || !editName.trim()}
                        >
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome</Label>
              <Input
                id="new-user-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-phone">Telefone</Label>
              <Input
                id="new-user-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!newName.trim()}>
              Adicionar usuário
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
