import { useState } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';

interface UserLoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateUser: (name: string, phone: string) => void;
}

export function UserLogin({ users, onLogin, onCreateUser }: UserLoginProps) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateUser = () => {
    if (newUserName.trim() && newUserPhone.trim()) {
      onCreateUser(newUserName.trim(), newUserPhone.trim());
      setNewUserName('');
      setNewUserPhone('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-strong animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistema BPO Financeiro</CardTitle>
          <CardDescription>
            Selecione seu usuário para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Users */}
          <div className="space-y-2">
            {users.map((user) => (
              <Button
                key={user.id}
                onClick={() => onLogin(user)}
                variant="outline"
                className="w-full h-12 justify-start text-left font-medium hover:bg-primary/5 hover:border-primary/20 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {user.name}
              </Button>
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
              <Input
                placeholder="Telefone (ex: +5511999999999)"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              />
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
