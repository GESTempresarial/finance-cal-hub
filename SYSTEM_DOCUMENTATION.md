# 📋 Descrição do Sistema Finance Cal Hub

## 🎯 Visão Geral

O **Finance Cal Hub** é um sistema completo de gestão de atividades e produtividade para equipes, desenvolvido com React, TypeScript e Supabase. É uma solução SaaS (Software as a Service) que permite gerenciar tarefas, clientes, tempo e produtividade de forma integrada.

---

## 🏗️ Arquitetura Técnica

### **Stack Principal**
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **UI**: shadcn/ui + TailwindCSS
- **Roteamento**: TanStack Router (React Router)
- **Gestão de Estado**: React Hooks + Context API

### **Estrutura de Pastas**
```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes base (shadcn)
│   ├── Calendar.tsx    # Calendário de atividades
│   ├── ActivityManager.tsx  # Gerenciador principal
│   └── ...
├── hooks/              # Custom hooks
│   ├── useActivities.ts
│   ├── useClients.ts
│   └── useTimers.ts
├── integrations/
│   └── supabase/       # Cliente e configuração Supabase
├── types/              # Interfaces TypeScript
└── lib/                # Utilitários
```

---

## 👥 Entidades Principais

### **1. Usuários (Users)**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```
- Sistema de autenticação com Supabase Auth
- Cada usuário vê apenas suas atividades atribuídas
- Suporte para múltiplos usuários por workspace

### **2. Clientes (Clients)**
```typescript
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  colorIndex: number;  // 1-10 para cores de identificação
  isActive: boolean;
  createdAt: Date;
}
```
- Cadastro de clientes com identificação visual por cores
- Status ativo/inativo
- 10 cores predefinidas para fácil identificação

### **3. Atividades (Activities)**
```typescript
interface Activity {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  clientName: string;
  assignedTo: string;        // Responsável principal
  assignedToName: string;
  assignedUsers?: string[];  // Múltiplos usuários
  date: Date;
  estimatedDuration: number; // minutos
  actualDuration?: number;   // minutos reais
  status: 'pending' | 'doing' | 'completed' | 
          'waiting-client' | 'waiting-team';
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ⚙️ Funcionalidades Principais

### **1. Gestão de Atividades**

#### **Criar Atividades**
- ✅ Título, descrição, cliente
- ✅ Data e tempo estimado
- ✅ Atribuição a múltiplos usuários
- ✅ Responsável principal definido
- ✅ Suporte a atividades recorrentes

#### **Atividades Recorrentes**
Permite criar tarefas que se repetem:

**Recorrência Diária:**
- Opção de incluir/excluir finais de semana
- Data de início e fim
- Cada dia gera uma "ocorrência" independente

**Recorrência Semanal:**
- Seleção de dias da semana (Dom-Sáb)
- Cada dia configurado gera uma ocorrência
- Data de início e fim

**Metadados Armazenados:**
```json
{
  "type": "daily|weekly",
  "endDate": "2025-12-31",
  "weekDays": [1,3,5],
  "completedDates": ["2025-10-30", "2025-10-31"],
  "includeWeekends": false
}
```
- Armazenados no campo `description` entre tags `<recurrence></recurrence>`
- Permite rastrear quais ocorrências foram concluídas

---

### **2. Sistema de Status**

| Status | Label | Uso |
|--------|-------|-----|
| `pending` | Pendente | Tarefa não iniciada |
| `doing` | Em Andamento | Tarefa sendo executada |
| `waiting-client` | Aguardando Cliente | Bloqueada esperando cliente |
| `waiting-team` | Aguardando Equipe | Bloqueada esperando time |
| `completed` | Concluída | Finalizada |

**Fluxo de Status:**
1. Atividade criada → `pending`
2. Usuário clica "Iniciar" → `doing` (inicia timer)
3. Durante execução:
   - Pode pausar/retomar timer
   - Pode marcar "Aguardando Cliente" ou "Aguardando Equipe"
4. Ao concluir → `completed` (salva tempo real gasto)

---

### **3. Sistema de Timers**

#### **Timer Global** (`useTimers.ts`)
```typescript
{
  activeTimers: Map<string, number>;  // activityId → segundos
  runningActivityId: string | null;   // qual está rodando
  startTimer(activityId: string): void;
  pauseTimer(activityId: string): void;
  stopTimer(activityId: string): void;
  getTimerSeconds(activityId: string): number;
  isTimerRunning(activityId: string): boolean;
  formatTimer(seconds: number): string;  // "HH:MM:SS"
}
```

**Características:**
- ✅ Apenas 1 timer ativo por vez (pausa automático ao iniciar outro)
- ✅ Persiste no `localStorage` (sobrevive a refresh)
- ✅ Atualiza a cada segundo
- ✅ Ao concluir, salva `actualDuration` em minutos

---

### **4. Calendário Visual**

#### **Visualização Mensal**
- 📅 Grid de 7 colunas (Dom-Sáb)
- 🎨 Cores dos clientes para identificação visual
- 📊 Indicadores de status em cada atividade
- ⏰ Timer em tempo real para atividades "doing"
- 🔁 Renderização automática de recorrências

#### **Interações:**
- Clicar em dia vazio → Abrir modal "Nova Atividade" com data pré-selecionada
- Clicar em atividade → Abrir modal de detalhes/edição
- Arrastar e soltar para reagendar (possível extensão)

#### **Renderização de Recorrências:**
O calendário analisa atividades recorrentes e gera ocorrências:
```typescript
// Para cada dia do mês
if (activity.isRecurring) {
  const meta = parseRecurrence(activity);
  
  if (isWithinDateRange(day, activity.date, meta.endDate)) {
    if (meta.type === 'daily') {
      if (includeWeekends || !isWeekend(day)) {
        renderOccurrence(day);
      }
    } else if (meta.type === 'weekly') {
      if (meta.weekDays.includes(day.getDay())) {
        renderOccurrence(day);
      }
    }
  }
}
```

---

### **5. Gerenciador de Atividades**

Painel principal com 3 seções:

#### **Hoje**
- Lista todas as atividades do dia atual
- Incluindo ocorrências de recorrências
- Botões de ação contextuais por status:
  - **Pendente**: `Iniciar`
  - **Fazendo**: `Pausar/Retomar`, `Aguardar Cliente/Equipe`, `Concluir`
  - **Concluída**: `Reabrir`
  - **Aguardando**: `Retomar`, `Concluir`

#### **Outras Atividades**
- Tarefas de outros dias
- Exibe apenas informações (sem botões de ação)
- Botão de edição e exclusão

#### **Atividades Recorrentes** (colapsável)
- Lista todas as recorrências cadastradas
- Mostra configuração (diária/semanal)
- Data início/fim
- Contador de ocorrências concluídas
- Botões de edição e exclusão

---

### **6. Picture-in-Picture (PiP)**

Funcionalidade única de timer flutuante:

#### **Como Funciona:**
1. Usuário clica em "PiP" (ícone Monitor) em uma atividade
2. Abre janela flutuante nativa do browser
3. Mostra em tempo real:
   - Nome da atividade
   - Cliente
   - Timer contando
   - Status (Rodando/Pausado)

#### **Atalhos Globais (com PiP ativo):**
- `Alt + P` → Play/Pause timer
- `Alt + F` → Finalizar/Concluir
- `Alt + C` → Aguardar Cliente
- `Alt + T` → Aguardar Equipe
- `Alt + E` → Editar atividade

#### **Tecnologia:**
```typescript
// Cria canvas, desenha informações, captura stream
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const stream = canvas.captureStream(30); // 30 FPS

const video = document.createElement('video');
video.srcObject = stream;
await video.requestPictureInPicture();
```

---

### **7. Filtros e Busca**

#### **Filtros Disponíveis:**
- 🔍 Busca textual (título e descrição)
- 📊 Filtro por status
- 👤 Filtro por cliente
- 🔁 Exibir/ocultar recorrentes

#### **Visibilidade:**
- Cada usuário vê apenas atividades onde está em `assignedUsers[]`
- Independente de quem criou a atividade

---

### **8. Confetes de Celebração 🎉**

Quando uma atividade é concluída:
```typescript
import { fireConfetti } from '@/lib/confetti';

// Ao concluir
fireConfetti(); // Dispara animação de confetes
```
- Usa biblioteca `canvas-confetti`
- Feedback visual positivo de realização

---

## 📊 Banco de Dados (Supabase)

### **Tabelas:**

#### **`users`**
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE
name TEXT
created_at TIMESTAMP
```

#### **`clients`**
```sql
id UUID PRIMARY KEY
name TEXT
email TEXT
phone TEXT
color_index INTEGER (1-10)
is_active BOOLEAN
user_id UUID REFERENCES users(id)
created_at TIMESTAMP
```

#### **`activities`**
```sql
id UUID PRIMARY KEY
title TEXT
description TEXT
client_id UUID REFERENCES clients(id)
client_name TEXT
assigned_to UUID REFERENCES users(id)
assigned_to_name TEXT
assigned_users UUID[] -- Array de user IDs
date DATE
estimated_duration INTEGER
actual_duration INTEGER
status TEXT
is_recurring BOOLEAN
recurrence_type TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### **Row Level Security (RLS):**
- Usuários só acessam dados onde `assigned_users` contém seu ID
- Clientes vinculados ao `user_id`

---

## 🎨 Sistema de Cores

### **10 Cores de Cliente:**
```css
--client-1: 217 91% 60%  /* Azul */
--client-2: 142 76% 36%  /* Verde */
--client-3: 24 95% 53%   /* Laranja */
--client-4: 271 81% 56%  /* Roxo */
--client-5: 339 90% 51%  /* Rosa */
--client-6: 199 89% 48%  /* Ciano */
--client-7: 45 93% 47%   /* Amarelo */
--client-8: 162 73% 46%  /* Teal */
--client-9: 0 84% 60%    /* Vermelho */
--client-10: 280 87% 47% /* Magenta */
```

**Uso:**
- Borda esquerda de cards
- Bullet points no calendário
- Identificação visual rápida

---

## 🔐 Autenticação e Segurança

### **Fluxo de Login:**
1. Usuário acessa aplicação
2. Redirecionado para login Supabase
3. Após autenticação, token JWT armazenado
4. Todas as requisições incluem token
5. RLS do Supabase valida permissões

### **Permissões:**
- ✅ Ver atividades onde está atribuído
- ✅ Editar atividades próprias
- ✅ Criar atividades
- ✅ Gerenciar próprios clientes
- ❌ Não vê dados de outros usuários

---

## 📱 Responsividade

Sistema totalmente responsivo:
- 📱 Mobile: Lista simplificada
- 💻 Tablet: Grid 2 colunas
- 🖥️ Desktop: Grid completo + sidebars

---

## 🚀 Fluxo de Trabalho Típico

### **Dia a Dia do Usuário:**

1. **Manhã:**
   - Abrir sistema
   - Ver atividades de "Hoje"
   - Iniciar primeira tarefa (timer começa)

2. **Durante o Dia:**
   - Pausar/retomar conforme necessário
   - Marcar "Aguardando Cliente" quando bloqueado
   - Concluir tarefas (🎉 confetes!)
   - Sistema salva tempo real gasto

3. **Planejamento:**
   - Criar novas atividades no calendário
   - Configurar recorrências para tarefas repetitivas
   - Atribuir para equipe

4. **Acompanhamento:**
   - Ver tempo estimado vs real
   - Filtrar por cliente/status
   - Reagendar se necessário

---

## 🔮 Dados Disponíveis para Integração

Para integração com sistemas externos (como bot WhatsApp), você terá acesso direto a:

### **Consultas Possíveis:**
```typescript
// Listar atividades do usuário hoje
listUserActivitiesToday(userId: string)

// Listar atividades pendentes
listPendingActivities(userId: string)

// Listar atividades de um cliente
listClientActivities(clientId: string)

// Ver tempo gasto hoje
getTodayTimeSpent(userId: string)

// Listar clientes
listUserClients(userId: string)
```

### **Ações Possíveis:**
```typescript
// Criar atividade
createActivity(data: ActivityInput)

// Atualizar status
updateActivityStatus(id: string, status: Status)

// Iniciar timer
startActivityTimer(id: string)

// Concluir tarefa
completeActivity(id: string)

// Marcar aguardando
setActivityWaiting(id: string, type: 'client'|'team')
```

### **Mapeamento para Sistemas Externos:**
```typescript
// Tabela adicional necessária para integração WhatsApp
interface WhatsAppMapping {
  id: string;
  phone: string;        // +5511999999999
  user_id: string;      // UUID do Supabase
  created_at: Date;
}
```

---

## 💡 Resumo Executivo

O sistema é um **gerenciador de tarefas orientado a tempo** com:
- ✅ Múltiplos usuários e clientes
- ✅ Timer integrado com persistência
- ✅ Recorrências automáticas
- ✅ Status detalhados de workflow
- ✅ Rastreamento de tempo estimado vs real
- ✅ Visualização por calendário
- ✅ Atribuição multi-usuário

**Ideal para:** Equipes que precisam controlar tempo gasto por cliente, gerenciar tarefas recorrentes e ter visibilidade clara de produtividade.

---

## 📝 Notas para Desenvolvimento de Integrações

### **Acesso ao Banco de Dados:**
- Use o cliente Supabase em `src/integrations/supabase/client.ts`
- Respeite as políticas de RLS configuradas
- Todas as operações devem incluir o `user_id` apropriado

### **Tipos TypeScript:**
- Importe interfaces de `src/types/index.ts`
- Mantenha consistência de tipos entre sistemas

### **Boas Práticas:**
- Valide sempre o `user_id` antes de operações
- Use transações para operações que afetam múltiplas tabelas
- Implemente retry logic para operações críticas
- Log todas as ações para auditoria

---

**Última atualização:** 30 de outubro de 2025
