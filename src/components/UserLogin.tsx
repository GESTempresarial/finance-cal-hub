import { useState } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, LogOut } from 'lucide-react';

interface UserLoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateUser: (name: string, phone?: string) => void;
  onUpdateUser: (id: string, updates: { name?: string; phone?: string | null }) => Promise<void> | void;
  onSignOut: () => void;
}

export function UserLogin({ users, onLogin, onCreateUser, onUpdateUser, onSignOut }: UserLoginProps) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleCreateUser = () => {
    if (newUserName.trim()) {
      onCreateUser(newUserName.trim(), newUserPhone.trim() || undefined);
      setNewUserName('');
      setNewUserPhone('');
      setShowCreateForm(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditPhone(user.phone || '');
    setIsSavingEdit(false);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditPhone('');
    setIsSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    setIsSavingEdit(true);
    try {
      await onUpdateUser(editingUserId, { phone: editPhone.trim() || null });
      cancelEdit();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={onSignOut}>
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-strong animate-scale-in">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Central de Operações</CardTitle>
          <CardDescription>
            Selecione seu usuário para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Users */}
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => onLogin(user)}
                    variant="outline"
                    className="flex-1 h-12 justify-start text-left font-medium hover:bg-primary/5 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      {user.phone && <span className="text-xs text-muted-foreground">Telefone: {user.phone}</span>}
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12"
                    onClick={() => startEdit(user)}
                  >
                    Editar
                  </Button>
                </div>
                {editingUserId === user.id && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input
                      placeholder="Telefone (opcional)"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={isSavingEdit} className="flex-1">
                        Salvar
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create New User */}
          {!showCreateForm ? (
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="ghost"
              className="w-full h-12 justify-start text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar novo usuário
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Nome do usuário"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                autoFocus
              />
              <div className="space-y-1">
                <Input
                  placeholder="Telefone (opcional)"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                />
                <p className="text-xs text-muted-foreground text-left">Você pode adicionar ou editar depois.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateUser} className="flex-1">
                  Adicionar
                </Button>
                <Button 
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewUserName('');
                    setNewUserPhone('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
