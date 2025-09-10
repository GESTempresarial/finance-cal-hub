import { useState, useEffect } from 'react';
import { User } from '@/types';
import { UserLogin } from '@/components/UserLogin';
import { MainLayout } from '@/components/MainLayout';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const Index = () => {
  const [users, setUsers] = useLocalStorage<User[]>('bpo-users', [
    { id: '1', name: 'Flavio', createdAt: new Date() },
    { id: '2', name: 'Eduardo', createdAt: new Date() }
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleCreateUser = (name: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

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
      onLogout={handleLogout}
    />
  );
};

export default Index;
