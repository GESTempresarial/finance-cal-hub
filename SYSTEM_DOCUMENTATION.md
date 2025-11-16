# 📋 Descrição do Sistema Finance Cal Hub

## 🎯 Visão Geral

O **Finance Cal Hub** é um sistema completo de gestão de atividades e produtividade para equipes, desenvolvido com React, TypeScript e Supabase. É uma solução SaaS (Software as a Service) que permite gerenciar tarefas, clientes, tempo e produtividade de forma integrada.

---

## 🏗️ Arquitetura Técnica

### **Stack Principal**
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Realtime)
- **UI**: shadcn/ui + TailwindCSS + Radix UI
- **Roteamento**: React Router v6
- **Gestão de Estado**: React Hooks + Context API
- **Editor de Texto**: TipTap (ProseMirror)
- **Animações**: Framer Motion + Canvas Confetti
- **Formulários**: React Hook Form + Zod
- **Datas**: date-fns

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
  name: string;
  phone?: string;  // Número de telefone para integração WhatsApp
  createdAt: Date;
}
```
- Sistema de autenticação simplificado baseado em nome/telefone
- Cada usuário vê apenas suas atividades atribuídas
- Suporte para múltiplos usuários por workspace
- Integração com WhatsApp via número de telefone

### **2. Clientes (Clients)**
```typescript
interface Client {
  id: string;
  name: string;
  colorIndex: number;  // 1-10 para cores de identificação
  notes?: string;      // Notas e observações sobre o cliente
  isActive: boolean;
  createdAt: Date;
}
```
- Cadastro de clientes com identificação visual por cores
- Status ativo/inativo
- 10 cores predefinidas para fácil identificação
- Campo de notas para observações importantes

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
  date: Date;
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
- ✅ Data
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
| `pending` | A Fazer | Tarefa não iniciada |
| `doing` | Fazendo | Tarefa sendo executada |
| `completed` | Feito | Finalizada |

**Observação:** Os status `waiting-client` e `waiting-team` foram removidos em versões recentes para simplificar o fluxo de trabalho.

**Fluxo de Status:**
1. Atividade criada → `pending`
2. Usuário clica "Iniciar" → `doing` (inicia timer)
3. Durante execução:
   - Pode pausar/retomar timer
   - Pode adicionar notas na descrição
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
- 🔄 Navegação entre meses (anterior/próximo)
- 📱 Responsivo para mobile, tablet e desktop

#### **Interações:**
- Clicar em dia vazio → Abrir modal "Nova Atividade" com data pré-selecionada
- Clicar em atividade → Abrir modal de detalhes/edição
- Hover sobre atividade → Mostra preview rápido

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
- Ordenação por status e prioridade
- Botões de ação contextuais por status:
  - **A Fazer**: `Iniciar`
  - **Fazendo**: `Pausar/Retomar`, `Concluir`
  - **Feito**: `Reabrir`
- Timer em tempo real para atividades em andamento

#### **Outras Atividades**
- Tarefas de outros dias (passado e futuro)
- Agrupadas por data
- Exibe status e informações resumidas
- Botões de edição e exclusão
- Filtros para busca rápida

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
- `Alt + E` → Editar atividade

**Observação:** Os atalhos para "Aguardar Cliente" e "Aguardar Equipe" foram removidos após simplificação do sistema de status.

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
- Todos os usuários visualizam todas as atividades, com filtros por responsável principal
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

### **9. Editor de Texto Rico (Rich Text)**

O sistema possui um editor de texto avançado para descrições de atividades:

#### **Funcionalidades:**
- **Formatação**: Negrito, itálico, sublinhado, código
- **Listas**: Listas ordenadas e não ordenadas
- **Task Lists**: Checkboxes para sub-tarefas
- **Títulos**: H1, H2, H3 para organização
- **Blocos de Código**: Para snippets e comandos
- **Links**: Inserção de links externos
- **Citações**: Blocos de citação

#### **Visualização:**
- Modo de edição completo ao criar/editar
- Visualização inline renderizada nas listagens
- Preserva toda formatação e estrutura

#### **Tecnologia:**
- **TipTap**: Editor baseado em ProseMirror
- **Extensions**: StarterKit, TaskList, TaskItem, Placeholder
- Salva em HTML no banco de dados
- Renderização segura com componente customizado

---

### **10. Controle via WhatsApp 📱**

O sistema oferece integração completa via WhatsApp, permitindo que usuários gerenciem suas atividades sem precisar acessar o navegador.

#### **Conceito de Integração:**
A integração WhatsApp funciona como uma interface alternativa ao sistema web, conectando-se diretamente ao banco de dados Supabase através de um bot intermediário.

#### **Arquitetura da Integração:**

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   WhatsApp  │ ←────→  │  Bot Server  │ ←────→  │  Supabase   │
│   (Usuário) │         │  (Node.js)   │         │  (Database) │
└─────────────┘         └──────────────┘         └─────────────┘
```

**Componentes:**
1. **Cliente WhatsApp**: Usuário interage via mensagens
2. **Bot Server**: Processa comandos e faz ponte com Supabase
3. **Supabase**: Banco de dados compartilhado com aplicação web

#### **Autenticação via WhatsApp:**
- Usuários são identificados pelo número de telefone
- Mapeamento `phone` → `user_id` no banco de dados
- Primeiro acesso requer confirmação de identidade

#### **Comandos Disponíveis:**

**📋 Consultas:**
```
/hoje           → Lista atividades do dia
/pendentes      → Lista atividades pendentes
/fazendo        → Mostra atividade em andamento
/clientes       → Lista seus clientes
/tempo          → Mostra tempo gasto hoje
/resumo         → Resumo completo do dia
```

**✅ Ações:**
```
/iniciar [ID]   → Inicia timer de uma atividade
/pausar         → Pausa timer atual
/retomar        → Retoma timer pausado
/concluir       → Finaliza atividade atual
/nova           → Inicia criação de atividade
/status [ID]    → Ver detalhes de atividade
```

**🔄 Gerenciamento:**
```
/clientes       → Gerenciar clientes
/ajuda          → Lista todos os comandos
/config         → Configurações pessoais
```

#### **Fluxo de Criação de Atividade:**

```
Usuário: /nova
Bot: Para qual cliente? (lista clientes com números)

Usuário: 1
Bot: Qual o título da atividade?

Usuário: Fechar balancete
Bot: Descreva a atividade (opcional):

Usuário: Conferir lançamentos e fechar
Bot: Qual a data? (hoje, amanhã, DD/MM)

Usuário: hoje
Bot: ✅ Atividade criada com sucesso!
     ID: ABC123
     Cliente: Empresa X
     Prazo: Hoje
```

#### **Notificações Automáticas:**

O bot pode enviar notificações proativas:

**Lembretes:**
- ⏰ Atividades próximas do prazo
- 📅 Tarefas do dia pela manhã (8h)
- ⚠️ Atividades atrasadas

**Status:**
- ✅ Quando alguém conclui uma atividade compartilhada
- 🔄 Quando são atribuídas novas atividades
- ⏱️ Lembrete de timer rodando há muito tempo

**Configuração de Notificações:**
```
/config notificacoes on/off
/config horario_lembrete 08:00
/config lembrar_atrasadas on/off
```

#### **Respostas Inteligentes:**

O bot entende linguagem natural:

```
Usuário: "começar a fazer o balancete"
Bot: 📋 Encontrei estas atividades relacionadas:
     1. Fechar balancete - Empresa X
     2. Balancete Q4 - Empresa Y
     Digite o número para iniciar.

Usuário: "1"
Bot: ✅ Timer iniciado!
     📊 Fechar balancete - Empresa X
     ⏱️ 00:00:05 (rodando)
```

Aceita variações como:
- "começar", "iniciar", "start"
- "terminar", "concluir", "finalizar"
- "hoje", "agora", "pendente"

#### **Tecnologias para Implementação:**

**Backend do Bot:**
```typescript
// Stack recomendada
- Node.js + TypeScript
- whatsapp-web.js ou Baileys (cliente WhatsApp)
- @supabase/supabase-js (conexão com DB)
- node-cron (agendamento de notificações)
- natural ou compromise (NLP básico)
```

**Estrutura do Bot:**
```typescript
interface WhatsAppBot {
  // Autenticação
  authenticateUser(phone: string): Promise<User>;
  
  // Comandos
  handleCommand(userId: string, command: string): Promise<string>;
  
  // Conversação
  handleConversation(userId: string, message: string): Promise<string>;
  
  // Notificações
  sendNotification(phone: string, message: string): Promise<void>;
  scheduleReminders(userId: string): void;
  
  // Queries Supabase
  listActivities(userId: string, filter?: string): Promise<Activity[]>;
  createActivity(userId: string, data: ActivityInput): Promise<Activity>;
  updateActivityStatus(activityId: string, status: string): Promise<void>;
  startTimer(userId: string, activityId: string): Promise<void>;
}
```

#### **Tabela de Mapeamento WhatsApp:**

Necessária para vincular números de telefone a usuários:

```sql
CREATE TABLE whatsapp_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE,
  conversation_state JSONB,  -- Estado da conversa atual
  notification_settings JSONB, -- Preferências de notificação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para busca rápida por telefone
CREATE INDEX idx_whatsapp_phone ON whatsapp_users(phone);
```

#### **Estado de Conversação:**

Para comandos multi-etapa (como criar atividade):

```typescript
interface ConversationState {
  command: string;           // 'create_activity'
  step: number;              // Etapa atual
  data: {                    // Dados coletados
    clientId?: string;
    title?: string;
    description?: string;
    date?: Date;
  };
  createdAt: Date;
  expiresAt: Date;          // Expira após 10 min de inatividade
}
```

#### **Segurança:**

**Validações:**
- ✅ Verificar se número está cadastrado
- ✅ Validar `user_id` em todas operações
- ✅ Respeitar RLS do Supabase
- ✅ Rate limiting (máximo de mensagens/minuto)
- ✅ Sanitizar inputs do usuário

**Logs:**
- Registrar todas as ações via WhatsApp
- Auditoria de comandos executados
- Monitoramento de uso

#### **Exemplo de Implementação Simplificada:**

```typescript
// bot-server/index.ts
import { Client, LocalAuth } from 'whatsapp-web.js';
import { createClient } from '@supabase/supabase-js';

const whatsapp = new Client({
  authStrategy: new LocalAuth()
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

whatsapp.on('message', async (msg) => {
  const phone = msg.from.replace('@c.us', '');
  
  // Buscar usuário
  const { data: whatsappUser } = await supabase
    .from('whatsapp_users')
    .select('user_id')
    .eq('phone', phone)
    .single();
  
  if (!whatsappUser) {
    await msg.reply('Número não cadastrado. Entre em contato com o administrador.');
    return;
  }
  
  // Processar comando
  const response = await handleCommand(whatsappUser.user_id, msg.body);
  await msg.reply(response);
});

async function handleCommand(userId: string, message: string) {
  if (message === '/hoje') {
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .contains('assigned_users', [userId])
      .eq('date', new Date().toISOString().split('T')[0]);
    
    if (!activities?.length) {
      return '📭 Nenhuma atividade para hoje!';
    }
    
    let response = '📋 *Atividades de Hoje:*\n\n';
    activities.forEach((act, i) => {
      response += `${i+1}. ${act.title}\n`;
      response += `   Cliente: ${act.client_name}\n`;
      response += `   Status: ${act.status}\n`;
      response += `   ID: ${act.id.slice(0, 8)}\n\n`;
    });
    
    return response;
  }
  
  // Outros comandos...
}

whatsapp.initialize();
```

#### **Benefícios da Integração:**

✅ **Acessibilidade**: Gerenciar tarefas de qualquer lugar  
✅ **Rapidez**: Comandos instantâneos via mensagem  
✅ **Notificações**: Alertas em tempo real  
✅ **Mobilidade**: Não requer abrir navegador  
✅ **Ubiquidade**: WhatsApp já está instalado  
✅ **Simplicidade**: Interface conversacional intuitiva  

#### **Limitações:**

⚠️ **Funcionalidades Limitadas**: Algumas features do web não estão disponíveis  
⚠️ **Formatação**: Texto simples, sem rich text completo  
⚠️ **Mídia**: Não suporta upload de arquivos (ainda)  
⚠️ **Visualização**: Sem calendário visual  
⚠️ **Conexão**: Depende do servidor do bot estar online  

---

## 📊 Banco de Dados (Supabase)

### **Tabelas:**

#### **`users`**
```sql
id UUID PRIMARY KEY
name TEXT
phone TEXT
created_at TIMESTAMP
```

#### **`clients`**
```sql
id UUID PRIMARY KEY
name TEXT
color_index INTEGER (1-10)
notes TEXT
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
started_at TIMESTAMP
completed_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### **`whatsapp_users`** (Para integração WhatsApp)
```sql
id UUID PRIMARY KEY
phone TEXT UNIQUE
user_id UUID REFERENCES users(id)
is_active BOOLEAN
last_message_at TIMESTAMP
conversation_state JSONB
notification_settings JSONB
created_at TIMESTAMP
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
2. Seleciona seu nome da lista ou cria novo usuário
3. Opcionalmente fornece número de telefone (para WhatsApp)
4. Sistema carrega apenas suas atividades
5. Dados persistem no Supabase

**Observação:** O sistema não usa Supabase Auth tradicional, mas sim uma autenticação simplificada baseada em seleção de usuário, ideal para equipes internas.

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

### **Dia a Dia do Usuário - Via Web:**

1. **Manhã:**
   - Abrir sistema
   - Ver atividades de "Hoje"
   - Iniciar primeira tarefa (timer começa)

2. **Durante o Dia:**
   - Pausar/retomar conforme necessário
   - Usar editor de texto rico para documentar progresso
   - Concluir tarefas (🎉 confetes!)
   - Sistema salva tempo real gasto

3. **Planejamento:**
   - Criar novas atividades no calendário
   - Configurar recorrências para tarefas repetitivas
   - Atribuir para equipe

4. **Acompanhamento:**
   - Filtrar por cliente/status
   - Reagendar se necessário

### **Dia a Dia do Usuário - Via WhatsApp:**

1. **Manhã:**
   - Receber mensagem com atividades do dia (8h)
   - Responder `/iniciar 1` para começar primeira tarefa

2. **Durante o Dia:**
   - `/pausar` quando necessário
   - `/retomar` para continuar
   - `/concluir` ao finalizar
   - Receber notificações de novas atribuições

3. **Consultas Rápidas:**
   - `/tempo` para ver quanto já trabalhou
   - `/pendentes` para ver o que falta
   - `/resumo` para overview completo

4. **Criação de Atividades:**
   - `/nova` inicia processo guiado
   - Bot pergunta cada informação
   - Confirma criação

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
- ✅ Recorrências automáticas (diária, semanal, mensal)
- ✅ Status detalhados de workflow
- ✅ Visualização por calendário mensal
- ✅ Editor de texto rico para descrições
- ✅ Picture-in-Picture com timer flutuante
- ✅ Integração via WhatsApp (em desenvolvimento)
- ✅ Interface responsiva (mobile, tablet, desktop)

**Ideal para:** Equipes de BPO financeiro que precisam controlar tempo gasto por cliente, gerenciar tarefas recorrentes, ter visibilidade clara de produtividade e acessar o sistema via múltiplas plataformas (web e WhatsApp).

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
- Para integração WhatsApp, sempre valide o número de telefone
- Use rate limiting em APIs públicas
- Sanitize user inputs antes de processar

---

## 🔄 Changelog de Versões

### **Versão Atual (Novembro 2025)**
✨ **Novas Funcionalidades:**
- Editor de texto rico (TipTap) para descrições
- Recorrência mensal (além de diária e semanal)
- Integração via WhatsApp (documentação e arquitetura)
- Campo de notas para clientes
- Melhorias na responsividade mobile

🔧 **Alterações:**
- Simplificação do sistema de status (removidos "waiting-client" e "waiting-team")
- Autenticação simplificada sem Supabase Auth
- Campo `phone` adicionado aos usuários
- Timestamps `started_at` e `completed_at` nas atividades

### **Versão Anterior (Outubro 2025)**
- Sistema base com calendário
- Timers e Picture-in-Picture
- Recorrências diárias e semanais
- Multi-usuário e multi-cliente
- Sistema de cores

---

**Última atualização:** 11 de novembro de 2025
