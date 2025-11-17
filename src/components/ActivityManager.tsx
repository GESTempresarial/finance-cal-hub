import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Client, User, STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Filter, Search, Play, Pause, CheckCircle, Clock, Edit, Trash2, RotateCcw, Monitor } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";
import { RichTextEditor } from "@/components/RichTextEditor";
import { InlineRichTextView } from "@/components/InlineRichTextView";
import { DatePicker } from "@/components/DatePicker";

interface ActivityManagerProps {
  activities: Activity[];
  clients: Client[];
  users: User[];
  visibleUserIds?: string[];
  onCreateActivity: (
    activity: Omit<Activity, "id" | "createdAt" | "updatedAt">
  ) => void;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (id: string) => void;
  onStatusChange: (id: string, status: Activity["status"]) => void;
  onCreateClient?: (client: Omit<Client, "id" | "createdAt">) => void;
  showCreateForm?: boolean;
  onCloseCreateForm?: () => void;
  onOpenCreateForm?: () => void;
  selectedActivityId?: string | null;
  onClearSelectedActivity?: () => void;
  createDate?: Date | null;
  onConsumeCreateDate?: () => void;
  onSelectActivity?: (id: string) => void;
  timersHook?: {
    activeTimers: Map<string, number>;
    runningActivityId: string | null;
    timerStateVersion: number;
    startTimer: (activityId: string) => void;
    pauseTimer: (activityId: string) => void;
    stopTimer: (activityId: string) => void;
    getTimerSeconds: (activityId: string) => number;
    isTimerRunning: (activityId: string) => boolean;
    formatTimer: (seconds: number) => string;
  };
}

export function ActivityManager({
  activities,
  clients,
  users,
  visibleUserIds,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  onStatusChange,
  onCreateClient,
  showCreateForm = false,
  onCloseCreateForm,
  onOpenCreateForm,
  selectedActivityId,
  onClearSelectedActivity,
  createDate,
  onConsumeCreateDate,
  onSelectActivity,
  timersHook,
}: ActivityManagerProps) {
  const defaultAssigneeId = users[0]?.id ?? "";
  const resolvedVisibleUserIds = useMemo(() => {
    if (visibleUserIds && visibleUserIds.length) {
      return visibleUserIds;
    }
    if (users.length) {
      return users.map((user) => user.id);
    }
    return [];
  }, [visibleUserIds, users]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showRecurring, setShowRecurring] = useState(false); // Estado para mostrar/ocultar recorrentes
  const [showOverdue, setShowOverdue] = useState(true); // Estado para mostrar/ocultar vencidas (aberto por padrão)
  const [showUpcoming, setShowUpcoming] = useState(false); // Estado para mostrar/ocultar próximas
  const [showCompleted, setShowCompleted] = useState(false); // Estado para mostrar/ocultar concluídas
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  ); // IDs das atividades com descrição expandida

  // Estados para criar novo cliente inline
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  // Toggle para expandir/colapsar descrição
  const toggleDescription = (activityId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Refs para PiP
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipAnimationRef = useRef<number>();
  const pipActivityIdRef = useRef<string | null>(null);
  const pipTimerRef = useRef<number>(0); // Ref para armazenar o tempo do timer no PiP

  // Força re-render quando o estado do timer muda (start/pause)
  // Isso garante que os botões de Pausar/Retomar sejam atualizados
  const timerVersion = timersHook?.timerStateVersion || 0;
  useEffect(() => {
    // Este efeito não faz nada, mas dispara re-render quando timerVersion muda
  }, [timerVersion]);

  // Usar timer do hook global ou fallback para timer local
  const activeTimers = timersHook?.activeTimers || new Map<string, number>();
  const startActivityTimer = (activityId: string) => {
    onStatusChange(activityId, "doing");
    if (timersHook) {
      timersHook.startTimer(activityId);
    }
  };

  const pauseActivityTimer = (activityId: string) => {
    if (timersHook) {
      timersHook.pauseTimer(activityId);
    }
  };

  const isTimerRunning = (activityId: string): boolean => {
    return timersHook?.isTimerRunning(activityId) || false;
  };

  const formatTimer = (seconds: number): string => {
    return timersHook?.formatTimer(seconds) || "0:00";
  };

  // Abrir Picture-in-Picture diretamente
  const openPictureInPicture = async (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    const client = clients.find((c) => c.id === activity.clientId);
    if (!client) return;

    try {
      // Criar canvas e video se não existirem
      if (!pipCanvasRef.current) {
        pipCanvasRef.current = document.createElement("canvas");
        pipCanvasRef.current.width = 600; // Aumentado para comportar duas colunas
        pipCanvasRef.current.height = 300;
      }

      if (!pipVideoRef.current) {
        pipVideoRef.current = document.createElement("video");
        pipVideoRef.current.muted = true;
      }

      const canvas = pipCanvasRef.current;
      const video = pipVideoRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      pipActivityIdRef.current = activityId;

      // Função para desenhar no canvas
      const drawTimer = () => {
        if (pipActivityIdRef.current !== activityId) return;

        // Buscar valores atualizados diretamente do hook a cada frame
        let currentSeconds = 0;
        let currentIsRunning = false;

        if (timersHook) {
          currentSeconds = timersHook.getTimerSeconds(activityId);
          currentIsRunning = timersHook.isTimerRunning(activityId);
          pipTimerRef.current = currentSeconds; // Atualizar o ref
        }

        // Limpar canvas completamente
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fundo gradiente
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height
        );
        gradient.addColorStop(0, "#667eea");
        gradient.addColorStop(1, "#764ba2");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Linha divisória vertical entre as duas colunas
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 20);
        ctx.lineTo(canvas.width / 2, canvas.height - 20);
        ctx.stroke();

        // ====== COLUNA ESQUERDA - INFORMAÇÕES PRINCIPAIS ======
        const leftCenter = canvas.width / 4;

        // Nome da atividade
        ctx.fillStyle = "white";
        ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        const title =
          activity.title.length > 20
            ? activity.title.substring(0, 20) + "..."
            : activity.title;
        ctx.fillText(title, leftCenter, 50);

        // Cliente
        ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(client.name, leftCenter, 75);

        // Timer grande
        ctx.font = "bold 72px monospace";
        ctx.fillStyle = "white";
        ctx.fillText(
          timersHook?.formatTimer(currentSeconds) || "0:00",
          leftCenter,
          160
        );

        // Label do timer
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("TEMPO DECORRIDO", leftCenter, 185);

        // Status com ícone
        const statusLabels: Record<Activity["status"], string> = {
          pending: "⏳ A FAZER",
          doing: currentIsRunning ? "▶ FAZENDO" : "⏸ PAUSADO",
          completed: "✅ FEITO",
        };

        const statusColors: Record<Activity["status"], string> = {
          pending: "#f87171",
          doing: currentIsRunning ? "#22c55e" : "#f59e0b",
          completed: "#22c55e",
        };

        const currentStatus = activity.status;
        ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = statusColors[currentStatus] || "#fbbf24";
        ctx.fillText(
          statusLabels[currentStatus] || "DESCONHECIDO",
          leftCenter,
          220
        );

        // ====== COLUNA DIREITA - ATALHOS ======
        const rightStart = canvas.width / 2 + 30;
        const rightCenter = canvas.width / 2 + canvas.width / 4;

        // Título da seção de atalhos
        ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.textAlign = "center";
        ctx.fillText("⌨️ ATALHOS DE TECLADO", rightCenter, 40);

        // Linha separadora horizontal
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightStart, 50);
        ctx.lineTo(canvas.width - 30, 50);
        ctx.stroke();

        // Atalhos - alinhados à esquerda
        ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textAlign = "left";

        let yPos = 80;
        const lineHeight = 30;

        // Play/Pause
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(rightStart, yPos - 12, 4, 16);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText("Alt + P", rightStart + 10, yPos);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Play/Pausar", rightStart + 75, yPos);

        // Finalizar
        yPos += lineHeight;
        ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#10b981";
        ctx.fillRect(rightStart, yPos - 12, 4, 16);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText("Alt + F", rightStart + 10, yPos);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Finalizar", rightStart + 75, yPos);

        // Editar
        yPos += lineHeight;
        ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(rightStart, yPos - 12, 4, 16);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText("Alt + E", rightStart + 10, yPos);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Editar", rightStart + 75, yPos);

        // Rodapé com dica
        ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.fillText(
          "Mantenha o navegador em foco para usar os atalhos",
          canvas.width / 2,
          canvas.height - 15
        );

        // Continuar animação
        pipAnimationRef.current = requestAnimationFrame(drawTimer);
      };

      // Desenhar inicialmente
      drawTimer();

      // Capturar stream do canvas
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      await video.play();

      // Ativar PiP
      if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();

        // Limpar quando sair do PiP
        video.addEventListener(
          "leavepictureinpicture",
          () => {
            if (pipAnimationRef.current) {
              cancelAnimationFrame(pipAnimationRef.current);
            }
            pipActivityIdRef.current = null;
          },
          { once: true }
        );
      } else {
        alert("Picture-in-Picture não é suportado neste navegador.");
      }
    } catch (error) {
      console.error("Erro ao ativar Picture-in-Picture:", error);
      alert(
        "Erro ao ativar Picture-in-Picture. Certifique-se de que seu navegador suporta esta funcionalidade."
      );
    }
  };

  // Atalhos de teclado globais para controle do timer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Se não tem PiP ativo, não fazer nada
      if (!pipActivityIdRef.current) return;

      const activityId = pipActivityIdRef.current;
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) return;

      // Alt + P: Play/Pausar
      if (e.altKey && e.code === "KeyP" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (activity.status === "pending") {
          // Se está pendente, iniciar
          startActivityTimer(activityId);
        } else if (activity.status === "doing") {
          // Se está fazendo, verificar se timer está rodando
          if (timersHook?.isTimerRunning(activityId)) {
            // Se está rodando, pausar
            pauseActivityTimer(activityId);
          } else {
            // Se está pausado, retomar
            if (timersHook) {
              timersHook.startTimer(activityId);
            }
          }
        }
      }

      // Alt + F: Finalizar/Concluir
      if (e.altKey && e.code === "KeyF" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        changeActivityStatus(activityId, "completed");
      }

      // Alt + E: Editar
      if (e.altKey && e.code === "KeyE" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSelectActivity?.(activityId);
      }
    };

    // Adicionar listener no documento para capturar eventos mesmo sem foco
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [activities, timersHook]);

  // Mudar status e parar timer
  const changeActivityStatus = (
    activityId: string,
    newStatus: Activity["status"]
  ) => {
    pauseActivityTimer(activityId);
    onStatusChange(activityId, newStatus);

    // Se concluir, limpar timer e registrar tempo
    if (newStatus === "completed") {
      const timerSeconds = activeTimers.get(activityId) || 0;
      const actualMinutes = Math.ceil(timerSeconds / 60); // Converter para minutos

      // Salvar o tempo real gasto
      onUpdateActivity(activityId, {
        actualDuration: actualMinutes,
      });

      if (timersHook) {
        timersHook.stopTimer(activityId);
      }
    }
  };

  // Create form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    assigneeId: defaultAssigneeId,
    dueDate: new Date(),
    isRecurring: false,
    recurrenceType: "daily" as "daily" | "weekly" | "monthly",
    endDate: new Date(),
    weekDays: [] as number[], // 0-6 (Sunday-Saturday)
    includeWeekends: true, // nova flag para recorrências diárias
    monthDay: new Date().getDate(),
  });
  // Se veio uma data do calendário, aplicar uma única vez
  useEffect(() => {
    if (createDate) {
      setFormData((prev) => ({
        ...prev,
        dueDate: createDate,
        monthDay:
          prev.recurrenceType === "monthly"
            ? createDate.getDate()
            : prev.monthDay,
      }));
      onConsumeCreateDate?.();
    }
  }, [createDate]);

  useEffect(() => {
    if (!users.length) return;
    setFormData((prev) => {
      const availableIds = users.map((user) => user.id);
      const nextAssignee = availableIds.includes(prev.assigneeId)
        ? prev.assigneeId
        : users[0].id;
      if (nextAssignee === prev.assigneeId) {
        return prev;
      }
      return {
        ...prev,
        assigneeId: nextAssignee,
      };
    });
  }, [users]);

  const filteredActivities = activities.filter((activity) => {
    const matchesUserFilter =
      resolvedVisibleUserIds.length === 0
        ? true
        : resolvedVisibleUserIds.includes(activity.assignedTo);
    if (!matchesUserFilter) return false;

    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || activity.status === statusFilter;
    const matchesClient =
      clientFilter === "all" || activity.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // Parse metadados de recorrência (mesma lógica utilizada no calendário)
  const parseRecurrence = (
    activity: Activity
  ): {
    type?: "daily" | "weekly" | "monthly";
    endDate?: Date;
    weekDays?: number[];
    monthDays?: number[];
    completedDates?: string[];
    includeWeekends?: boolean;
  } => {
    const result: {
      type?: "daily" | "weekly" | "monthly";
      endDate?: Date;
      weekDays?: number[];
      monthDays?: number[];
      completedDates?: string[];
      includeWeekends?: boolean;
    } = {};
    if (!activity.description) return result;
    const match = activity.description.match(/<recurrence>(.*?)<\/recurrence>/);
    if (!match) return result;
    try {
      const meta = JSON.parse(match[1]);
      if (meta.type === "daily" || meta.type === "weekly" || meta.type === "monthly")
        result.type = meta.type;
      if (meta.endDate) {
        const [y, m, d] = String(meta.endDate).split("-").map(Number);
        if (y && m && d) result.endDate = new Date(y, m - 1, d);
      }
      if (Array.isArray(meta.weekDays))
        result.weekDays = meta.weekDays as number[];
      if (Array.isArray(meta.monthDays))
        result.monthDays = meta.monthDays as number[];
      if (Array.isArray(meta.completedDates))
        result.completedDates = meta.completedDates as string[];
      if (typeof meta.includeWeekends === "boolean")
        result.includeWeekends = meta.includeWeekends;
    } catch {}
    return result;
  };

  // Separar hoje e outras
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const {
    todayActivities,
    overdueActivities,
    upcomingActivities,
    completedActivities,
    recurringActivities,
  } = useMemo(() => {
    const todayList: Activity[] = [];
    const overdue: Activity[] = [];
    const upcoming: Activity[] = [];
    const completed: Activity[] = [];
    const recurring: Activity[] = [];

    filteredActivities.forEach((a) => {
      const baseDate = new Date(a.date);
      baseDate.setHours(0, 0, 0, 0);

      // Se é recorrente, verificar se tem ocorrência hoje
      if (a.isRecurring) {
        recurring.push(a);

        // Verificar se hoje está dentro do período de recorrência
        const meta = parseRecurrence(a);
        const endDate = meta.endDate || baseDate;
        endDate.setHours(0, 0, 0, 0);

        if (today >= baseDate && today <= endDate) {
          const type = a.recurrenceType || meta.type;
          let shouldAppearToday = false;

          if (type === "daily") {
            const includeWeekends = (meta as any).includeWeekends !== false;
            const todayWeekday = today.getDay();
            if (includeWeekends || (todayWeekday !== 0 && todayWeekday !== 6)) {
              shouldAppearToday = true;
            }
          } else if (type === "weekly") {
            const weekDays =
              meta.weekDays && meta.weekDays.length
                ? meta.weekDays
                : [baseDate.getDay()];
            if (weekDays.includes(today.getDay())) {
              shouldAppearToday = true;
            }
          }

          if (shouldAppearToday) {
            // Criar uma cópia da atividade representando a ocorrência de hoje
            const todayOccurrence = {
              ...a,
              // Manter o ID original mas marcar que é uma ocorrência de hoje
              date: new Date(today),
            };
            todayList.push(todayOccurrence);
          }
        }
        // NÃO retornar aqui - continuar para verificar outras categorizações
      }

      // Não recorrente OU recorrente (para todas as categorizações)
      if (baseDate.getTime() === today.getTime()) {
        if (!a.isRecurring) { // Só adicionar se não for recorrente (recorrentes já foram adicionados acima)
          todayList.push(a);
        }
      } else {
        // Separar em vencidas, próximas e concluídas
        if (a.status === "completed") {
          completed.push(a);
        } else if (baseDate < today) {
          // Vencidas: data anterior a hoje e não concluída
          overdue.push(a);
        } else {
          // Próximas: data futura e não concluída
          upcoming.push(a);
        }
      }
    });

    return {
      todayActivities: todayList,
      overdueActivities: overdue,
      upcomingActivities: upcoming,
      completedActivities: completed,
      recurringActivities: recurring,
    };
  }, [filteredActivities]);

  // Scroll até atividade selecionada ao vir do calendário
  const selectedRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedActivityId && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedActivityId]);

  // Detalhes/edição da atividade selecionada
  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  const [editData, setEditData] = useState<{
    title: string;
    description?: string;
    status: Activity["status"];
    assignedTo: string;
    clientId: string;
    date: Date;
  }>({
    title: "",
    description: "",
    status: "pending",
    assignedTo: "",
    clientId: "",
    date: new Date(),
  });
  const [recurrenceEdit, setRecurrenceEdit] = useState<{
    enabled: boolean;
    type: "daily" | "weekly" | "monthly";
    endDate: Date;
    weekDays: number[];
    monthDay: number;
    completedDates: string[];
    includeWeekends: boolean;
  }>({
    enabled: false,
    type: "daily",
    endDate: new Date(),
    weekDays: [],
    monthDay: new Date().getDate(),
    completedDates: [],
    includeWeekends: true,
  });
  useEffect(() => {
    if (selectedActivity) {
      setEditData({
        title: selectedActivity.title,
        description:
          selectedActivity.description
            ?.replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
            .trim() || "",
        status: selectedActivity.status,
        assignedTo: selectedActivity.assignedTo,
        clientId: selectedActivity.clientId,
        date: new Date(selectedActivity.date),
      });
      const meta = parseRecurrence(selectedActivity);
      setRecurrenceEdit({
        enabled: !!(selectedActivity.isRecurring || meta.type),
        type: (selectedActivity.recurrenceType || meta.type || "daily") as
          | "daily"
          | "weekly"
          | "monthly",
        endDate: meta.endDate || new Date(),
        weekDays: meta.weekDays || [],
        monthDay: meta.monthDays?.[0] || new Date(selectedActivity.date).getDate(),
        completedDates: meta.completedDates || [],
        includeWeekends: (meta as any).includeWeekends !== false,
      });
    }
  }, [selectedActivity]);

  const handleCreateActivity = async () => {
    if (
      !formData.title.trim() ||
      !formData.clientId ||
      !formData.assigneeId
    )
      return;

    const assignee = users.find((user) => user.id === formData.assigneeId);

    // Se recorrente, embute metadados na descrição para o calendário renderizar ocorrências
    let description = formData.description;
    if (formData.isRecurring) {
      const recurMeta = {
        type: formData.recurrenceType,
        endDate: format(formData.endDate, "yyyy-MM-dd"),
        weekDays:
          formData.recurrenceType === "weekly" ? formData.weekDays : undefined,
        includeWeekends:
          formData.recurrenceType === "daily"
            ? formData.includeWeekends
            : undefined,
        monthDays:
          formData.recurrenceType === "monthly"
            ? [formData.monthDay]
            : undefined,
      };
      description = `${description || ""}\n<recurrence>${JSON.stringify(
        recurMeta
      )}</recurrence>`;
    }

    await onCreateActivity({
      title: formData.title,
      description,
      clientId: formData.clientId,
      assignedTo: formData.assigneeId,
      assignedToName: assignee?.name,
      clientName: clients.find((c) => c.id === formData.clientId)?.name || "",
      date: formData.dueDate,
      status: "pending",
      isRecurring: formData.isRecurring,
      recurrenceType: formData.isRecurring
        ? formData.recurrenceType
        : undefined,
    });

    // Reset form
    const fallbackAssignee = users[0]?.id ?? "";
    setFormData({
      title: "",
      description: "",
      clientId: "",
      assigneeId: fallbackAssignee,
      dueDate: new Date(),
      isRecurring: false,
      recurrenceType: "daily",
      endDate: new Date(),
      weekDays: [],
      includeWeekends: true,
      monthDay: new Date().getDate(),
    });

    onCloseCreateForm?.();
  };

  const getClientById = (clientId: string) => {
    return clients.find((client) => client.id === clientId);
  };

  // Função auxiliar para obter a cor baseada no status
  const getStatusColor = (status: Activity["status"]) => {
    if (status === "pending") return "hsl(0, 84%, 60%)"; // Vermelho - A fazer
    if (status === "doing") return "hsl(45, 93%, 47%)"; // Amarelo - Fazendo
    if (status === "completed") return "hsl(142, 71%, 45%)"; // Verde - Feito
    return "hsl(0, 0%, 50%)"; // Cinza padrão
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity || !editData.title.trim() || !editData.clientId || !editData.assignedTo) {
      return;
    }

    // Preservar ou criar metadados de recorrência
    let finalDescription = editData.description || "";
    if (recurrenceEdit.enabled) {
      const recurMeta = {
        type: recurrenceEdit.type,
        endDate: format(recurrenceEdit.endDate, "yyyy-MM-dd"),
        weekDays: recurrenceEdit.type === "weekly" ? recurrenceEdit.weekDays : undefined,
        includeWeekends: recurrenceEdit.type === "daily" ? recurrenceEdit.includeWeekends : undefined,
        monthDays: recurrenceEdit.type === "monthly" ? [recurrenceEdit.monthDay] : undefined,
        completedDates: recurrenceEdit.completedDates || [],
      };
      // Remover metadados antigos e adicionar novos
      const cleanDesc = finalDescription.replace(/\n?<recurrence>(.*?)<\/recurrence>/, "").trim();
      finalDescription = `${cleanDesc}\n<recurrence>${JSON.stringify(recurMeta)}</recurrence>`;
    } else {
      // Remover metadados se desabilitou recorrência
      finalDescription = finalDescription.replace(/\n?<recurrence>(.*?)<\/recurrence>/, "").trim();
    }

    await onUpdateActivity(selectedActivity.id, {
      title: editData.title,
      description: finalDescription,
      clientId: editData.clientId,
      assignedTo: editData.assignedTo,
      date: editData.date,
      status: editData.status,
      isRecurring: recurrenceEdit.enabled,
      recurrenceType: recurrenceEdit.enabled ? recurrenceEdit.type : undefined,
    });

    onClearSelectedActivity?.();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            Gerenciar Atividades
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredActivities.length} atividades encontradas
          </p>
        </div>
        <Button
          onClick={() => onOpenCreateForm?.()}
          className="w-full sm:w-auto"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar atividades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients
                  .filter((c) => c.isActive)
                  .map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="grid gap-6">
        {/* Hoje */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Hoje
          </h3>
          <div className="grid gap-4">
            {todayActivities.map((activity) => {
              const client = getClientById(activity.clientId);
              if (!client) return null;

              const isSelected = selectedActivityId === activity.id;
              const isRunning = isTimerRunning(activity.id);
              const timerSeconds = activeTimers.get(activity.id) || 0;

              // Verificar se é uma ocorrência de atividade recorrente de hoje
              const isRecurringOccurrence = activity.isRecurring;
              const todayStr = format(today, "yyyy-MM-dd");
              const meta = parseRecurrence(activity);
              const isCompletedToday =
                isRecurringOccurrence &&
                meta.completedDates?.includes(todayStr);

              // Para atividades recorrentes, o status depende se está concluída hoje OU se está rodando/fazendo
              let displayStatus: Activity["status"];
              if (isRecurringOccurrence) {
                if (isCompletedToday) {
                  displayStatus = "completed";
                } else if (activity.status === "doing" || isRunning) {
                  displayStatus = "doing";
                } else {
                  displayStatus = "pending";
                }
              } else {
                displayStatus = activity.status;
              }

              return (
                <Card
                  key={activity.id}
                  className={cn(
                    "p-3 md:p-4 transition border-l-4",
                    isSelected ? "ring-2 ring-primary" : ""
                  )}
                  style={{
                    borderLeftColor: getStatusColor(displayStatus),
                  }}
                  ref={isSelected ? selectedRef : undefined}
                >
                  <div className="space-y-2 md:space-y-3">
                    {/* Header com título e cliente */}
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base truncate">
                            {activity.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs md:text-sm text-muted-foreground truncate">
                              {client.name}
                            </span>
                            {isRecurringOccurrence && (
                              <Badge variant="secondary" className="text-xs">
                                ↔️ Recorrente
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="text-xs ml-auto"
                            >
                              {STATUS_LABELS[displayStatus]}
                            </Badge>
                          </div>
                        </div>

                        {/* Botão para expandir/colapsar descrição */}
                        {activity.description &&
                          activity.description
                            .replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
                            .trim() && (
                            <div className="mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDescription(activity.id)}
                                className="h-7 px-2 text-xs mb-1"
                              >
                                {expandedDescriptions.has(activity.id)
                                  ? "▼ Ocultar Descrição"
                                  : "▶ Mostrar Descrição"}
                              </Button>

                              {expandedDescriptions.has(activity.id) && (
                                <InlineRichTextView
                                  content={activity.description
                                    .replace(
                                      /\n?<recurrence>(.*?)<\/recurrence>/,
                                      ""
                                    )
                                    .trim()}
                                  onChange={(html) => {
                                    // Preservar metadados de recorrência ao atualizar
                                    const recurrenceMatch =
                                      activity.description?.match(
                                        /<recurrence>(.*?)<\/recurrence>/
                                      );
                                    const newDescription = recurrenceMatch
                                      ? `${html}\n<recurrence>${recurrenceMatch[1]}</recurrence>`
                                      : html;
                                    onUpdateActivity(activity.id, {
                                      description: newDescription,
                                    });
                                  }}
                                  editable={true}
                                  placeholder="Clique para adicionar descrição..."
                                />
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Informações e ações */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-2 border-t">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        <span>📅 Hoje</span>
                        {displayStatus === "completed" &&
                          activity.actualDuration && (
                            <span className="text-green-600 font-medium">
                              ✅ {activity.actualDuration} min realizado
                            </span>
                          )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 md:gap-2">
                        {/* Timer display */}
                        {(displayStatus === "doing" || isRunning) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm font-mono">
                            <Clock className="w-3 h-3" />
                            {formatTimer(timerSeconds)}
                          </div>
                        )}

                        {/* Botões de ação baseados no status */}
                        {displayStatus === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (isRecurringOccurrence) {
                                // Para recorrentes, atualizar o status para doing
                                onUpdateActivity(activity.id, {
                                  status: "doing",
                                });
                                startActivityTimer(activity.id);
                              } else {
                                startActivityTimer(activity.id);
                              }
                            }}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Iniciar
                          </Button>
                        )}

                        {displayStatus === "doing" && (
                          <>
                            {isRunning ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => pauseActivityTimer(activity.id)}
                                className="gap-1"
                              >
                                <Pause className="w-3 h-3" />
                                Pausar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (timersHook) {
                                    timersHook.startTimer(activity.id);
                                  }
                                }}
                                className="gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Retomar
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                if (isRecurringOccurrence) {
                                  // Marcar esta ocorrência como concluída
                                  pauseActivityTimer(activity.id);
                                  const updatedCompletedDates = [
                                    ...(meta.completedDates || []),
                                    todayStr,
                                  ];
                                  const updatedMeta = {
                                    ...meta,
                                    completedDates: updatedCompletedDates,
                                  };
                                  const recurrenceBlock = `\n<recurrence>${JSON.stringify(
                                    updatedMeta
                                  )}</recurrence>`;
                                  const cleanDesc =
                                    activity.description
                                      ?.replace(
                                        /\n?<recurrence>(.*?)<\/recurrence>/,
                                        ""
                                      )
                                      .trim() || "";

                                  // Calcular e salvar tempo real gasto
                                  const timerSeconds =
                                    activeTimers.get(activity.id) || 0;
                                  const actualMinutes = Math.ceil(
                                    timerSeconds / 60
                                  );

                                  onUpdateActivity(activity.id, {
                                    description:
                                      `${cleanDesc}${recurrenceBlock}`.trim(),
                                    status: "pending", // Resetar para pending para o próximo dia
                                    actualDuration: actualMinutes,
                                  });

                                  if (timersHook) {
                                    timersHook.stopTimer(activity.id);
                                  }

                                  fireConfetti();
                                } else {
                                  changeActivityStatus(
                                    activity.id,
                                    "completed"
                                  );
                                }
                              }}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Concluir
                            </Button>
                          </>
                        )}

                        {displayStatus === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (isRecurringOccurrence) {
                                // Remover a data de completedDates e resetar status para pending
                                const updatedCompletedDates = (
                                  meta.completedDates || []
                                ).filter((d) => d !== todayStr);
                                const updatedMeta = {
                                  ...meta,
                                  completedDates: updatedCompletedDates,
                                };
                                const recurrenceBlock = `\n<recurrence>${JSON.stringify(
                                  updatedMeta
                                )}</recurrence>`;
                                const cleanDesc =
                                  activity.description
                                    ?.replace(
                                      /\n?<recurrence>(.*?)<\/recurrence>/,
                                      ""
                                    )
                                    .trim() || "";
                                onUpdateActivity(activity.id, {
                                  description:
                                    `${cleanDesc}${recurrenceBlock}`.trim(),
                                  status: "pending",
                                });
                              } else {
                                changeActivityStatus(activity.id, "pending");
                              }
                            }}
                            className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                            title="Reverter conclusão"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reabrir
                          </Button>
                        )}

                        {/* Botões de editar e excluir */}
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPictureInPicture(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Abrir Picture-in-Picture"
                          >
                            <Monitor className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectActivity?.(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Editar atividade"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                confirm(
                                  "Deseja realmente excluir esta atividade?"
                                )
                              ) {
                                pauseActivityTimer(activity.id);
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                            title="Excluir atividade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {todayActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sem atividades para hoje.
              </p>
            )}
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* Atividades Vencidas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-destructive">
              ⚠️ Atividades Vencidas ({overdueActivities.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOverdue(!showOverdue)}
              className="h-8"
            >
              {showOverdue ? "▼ Ocultar" : "▶ Mostrar"}
            </Button>
          </div>

          {showOverdue && (
            <div className="grid gap-4">
              {overdueActivities.map((activity) => {
                const client = getClientById(activity.clientId);
                if (!client) return null;

                const isRunning = isTimerRunning(activity.id);
                const timerSeconds = activeTimers.get(activity.id) || 0;
                const displayStatus = activity.status;

                return (
                  <Card
                    key={activity.id}
                    className="p-4 transition border-l-4 bg-destructive/5"
                    style={{
                      borderLeftColor: getStatusColor(displayStatus),
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <span className="text-sm text-muted-foreground">
                              {client.name}
                            </span>
                            <Badge
                              variant="destructive"
                              className="text-xs ml-auto"
                            >
                              {STATUS_LABELS[activity.status]}
                            </Badge>
                          </div>

                          {/* Botão para expandir/colapsar descrição */}
                          {activity.description &&
                            activity.description
                              .replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
                              .trim() && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDescription(activity.id)}
                                  className="h-7 px-2 text-xs mb-1"
                                >
                                  {expandedDescriptions.has(activity.id)
                                    ? "▼ Ocultar Descrição"
                                    : "▶ Mostrar Descrição"}
                                </Button>

                                {expandedDescriptions.has(activity.id) && (
                                  <InlineRichTextView
                                    content={activity.description
                                      .replace(
                                        /\n?<recurrence>(.*?)<\/recurrence>/,
                                        ""
                                      )
                                      .trim()}
                                    onChange={(html) => {
                                      const recurrenceMatch =
                                        activity.description?.match(
                                          /<recurrence>(.*?)<\/recurrence>/
                                        );
                                      const newDescription = recurrenceMatch
                                        ? `${html}\n<recurrence>${recurrenceMatch[1]}</recurrence>`
                                        : html;
                                      onUpdateActivity(activity.id, {
                                        description: newDescription,
                                      });
                                    }}
                                    editable={true}
                                    placeholder="Clique para adicionar descrição..."
                                  />
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-2 border-t">
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                          <span className="text-destructive font-medium">
                            📅 {format(new Date(activity.date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                          {displayStatus === "completed" &&
                            activity.actualDuration && (
                              <span className="text-green-600 font-medium">
                                ✅ {activity.actualDuration} min realizado
                              </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 md:gap-2">
                          {/* Timer display */}
                          {(displayStatus === "doing" || isRunning) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm font-mono">
                              <Clock className="w-3 h-3" />
                              {formatTimer(timerSeconds)}
                            </div>
                          )}

                          {/* Botões de ação baseados no status */}
                          {displayStatus === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => startActivityTimer(activity.id)}
                              className="gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Iniciar
                            </Button>
                          )}

                          {displayStatus === "doing" && (
                            <>
                              {isRunning ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pauseActivityTimer(activity.id)}
                                  className="gap-1"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pausar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (timersHook) {
                                      timersHook.startTimer(activity.id);
                                    }
                                  }}
                                  className="gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Retomar
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  changeActivityStatus(
                                    activity.id,
                                    "completed"
                                  );
                                }}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Concluir
                              </Button>
                            </>
                          )}

                          {displayStatus === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                changeActivityStatus(activity.id, "pending");
                              }}
                              className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                              title="Reverter conclusão"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reabrir
                            </Button>
                          )}

                          {/* Botões de editar e excluir */}
                          <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSelectActivity?.(activity.id)}
                              className="gap-1 h-8 px-2"
                              title="Editar atividade"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Deseja realmente excluir esta atividade?"
                                  )
                                ) {
                                  pauseActivityTimer(activity.id);
                                  onDeleteActivity(activity.id);
                                }
                              }}
                              className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                              title="Excluir atividade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {overdueActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem atividades vencidas.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* Próximas Atividades */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              📅 Próximas Atividades ({upcomingActivities.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpcoming(!showUpcoming)}
              className="h-8"
            >
              {showUpcoming ? "▼ Ocultar" : "▶ Mostrar"}
            </Button>
          </div>

          {showUpcoming && (
            <div className="grid gap-4">
              {upcomingActivities.map((activity) => {
                const client = getClientById(activity.clientId);
                if (!client) return null;

                const isRunning = isTimerRunning(activity.id);
                const timerSeconds = activeTimers.get(activity.id) || 0;
                const displayStatus = activity.status;

                return (
                  <Card
                    key={activity.id}
                    className="p-4 transition border-l-4"
                    style={{
                      borderLeftColor: getStatusColor(displayStatus),
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <span className="text-sm text-muted-foreground">
                              {client.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs ml-auto"
                            >
                              {STATUS_LABELS[activity.status]}
                            </Badge>
                          </div>

                          {/* Botão para expandir/colapsar descrição */}
                          {activity.description &&
                            activity.description
                              .replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
                              .trim() && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDescription(activity.id)}
                                  className="h-7 px-2 text-xs mb-1"
                                >
                                  {expandedDescriptions.has(activity.id)
                                    ? "▼ Ocultar Descrição"
                                    : "▶ Mostrar Descrição"}
                                </Button>

                                {expandedDescriptions.has(activity.id) && (
                                  <InlineRichTextView
                                    content={activity.description
                                      .replace(
                                        /\n?<recurrence>(.*?)<\/recurrence>/,
                                        ""
                                      )
                                      .trim()}
                                    onChange={(html) => {
                                      const recurrenceMatch =
                                        activity.description?.match(
                                          /<recurrence>(.*?)<\/recurrence>/
                                        );
                                      const newDescription = recurrenceMatch
                                        ? `${html}\n<recurrence>${recurrenceMatch[1]}</recurrence>`
                                        : html;
                                      onUpdateActivity(activity.id, {
                                        description: newDescription,
                                      });
                                    }}
                                    editable={true}
                                    placeholder="Clique para adicionar descrição..."
                                  />
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-2 border-t">
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                          <span>
                            📅 {format(new Date(activity.date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                          {displayStatus === "completed" &&
                            activity.actualDuration && (
                              <span className="text-green-600 font-medium">
                                ✅ {activity.actualDuration} min realizado
                              </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 md:gap-2">
                          {/* Timer display */}
                          {(displayStatus === "doing" || isRunning) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm font-mono">
                              <Clock className="w-3 h-3" />
                              {formatTimer(timerSeconds)}
                            </div>
                          )}

                          {/* Botões de ação baseados no status */}
                          {displayStatus === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => startActivityTimer(activity.id)}
                              className="gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Iniciar
                            </Button>
                          )}

                          {displayStatus === "doing" && (
                            <>
                              {isRunning ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pauseActivityTimer(activity.id)}
                                  className="gap-1"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pausar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (timersHook) {
                                      timersHook.startTimer(activity.id);
                                    }
                                  }}
                                  className="gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Retomar
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  changeActivityStatus(
                                    activity.id,
                                    "completed"
                                  );
                                }}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Concluir
                              </Button>
                            </>
                          )}

                          {displayStatus === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                changeActivityStatus(activity.id, "pending");
                              }}
                              className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                              title="Reverter conclusão"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reabrir
                            </Button>
                          )}

                          {/* Botões de editar e excluir */}
                          <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSelectActivity?.(activity.id)}
                              className="gap-1 h-8 px-2"
                              title="Editar atividade"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Deseja realmente excluir esta atividade?"
                                  )
                                ) {
                                  pauseActivityTimer(activity.id);
                                  onDeleteActivity(activity.id);
                                }
                              }}
                              className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                              title="Excluir atividade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {upcomingActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem próximas atividades.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* Atividades Concluídas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Atividades Concluídas ({completedActivities.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="h-8"
            >
              {showCompleted ? "▼ Ocultar" : "▶ Mostrar"}
            </Button>
          </div>

          {showCompleted && (
            <div className="grid gap-4">
              {completedActivities.map((activity) => {
                const client = getClientById(activity.clientId);
                if (!client) return null;

                return (
                  <Card
                    key={activity.id}
                    className="p-4 transition border-l-4"
                    style={{
                      borderLeftColor: getStatusColor(activity.status),
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <span className="text-sm text-muted-foreground">
                              {client.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs ml-auto"
                            >
                              ✅ {STATUS_LABELS[activity.status]}
                            </Badge>
                          </div>

                          {/* Botão para expandir/colapsar descrição */}
                          {activity.description &&
                            activity.description
                              .replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
                              .trim() && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDescription(activity.id)}
                                  className="h-7 px-2 text-xs mb-1"
                                >
                                  {expandedDescriptions.has(activity.id)
                                    ? "▼ Ocultar Descrição"
                                    : "▶ Mostrar Descrição"}
                                </Button>

                                {expandedDescriptions.has(activity.id) && (
                                  <InlineRichTextView
                                    content={activity.description
                                      .replace(
                                        /\n?<recurrence>(.*?)<\/recurrence>/,
                                        ""
                                      )
                                      .trim()}
                                    onChange={(html) => {
                                      // Preservar metadados de recorrência ao atualizar
                                      const recurrenceMatch =
                                        activity.description?.match(
                                          /<recurrence>(.*?)<\/recurrence>/
                                        );
                                      const newDescription = recurrenceMatch
                                        ? `${html}\n<recurrence>${recurrenceMatch[1]}</recurrence>`
                                        : html;
                                      onUpdateActivity(activity.id, {
                                        description: newDescription,
                                      });
                                    }}
                                    editable={true}
                                    placeholder="Clique para adicionar descrição..."
                                  />
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            📅{" "}
                            {format(new Date(activity.date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                          {activity.actualDuration && (
                            <span className="text-green-600 font-medium">
                              ✅ {activity.actualDuration} min realizado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              changeActivityStatus(activity.id, "pending")
                            }
                            className="gap-1 border-green-600 text-green-600 hover:bg-green-50"
                            title="Reverter conclusão"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reabrir
                          </Button>

                          <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSelectActivity?.(activity.id)}
                              className="gap-1 h-8 px-2"
                              title="Editar atividade"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Deseja realmente excluir esta atividade?"
                                  )
                                ) {
                                  onDeleteActivity(activity.id);
                                }
                              }}
                              className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                              title="Excluir atividade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {completedActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem atividades concluídas.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* Atividades Recorrentes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Atividades Recorrentes ({recurringActivities.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecurring(!showRecurring)}
              className="h-8"
            >
              {showRecurring ? "▼ Ocultar" : "▶ Mostrar"}
            </Button>
          </div>

          {showRecurring && (
            <div className="grid gap-4">
              {recurringActivities.map((activity) => {
                const client = getClientById(activity.clientId);
                if (!client) return null;

                const meta = parseRecurrence(activity);
                const recurrenceInfo =
                  activity.recurrenceType === "daily"
                    ? `Diária ${
                        (meta as any).includeWeekends === false
                          ? "(sem finais de semana)"
                          : ""
                      }`
                    : activity.recurrenceType === "weekly"
                    ? `Semanal`
                    : "Recorrente";

                return (
                  <Card
                    key={activity.id}
                    className="p-4 transition border-l-4"
                    style={{
                      borderLeftColor: getStatusColor(activity.status),
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              ↔️ {recurrenceInfo}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {client.name}
                            </span>
                          </div>

                          {/* Botão para expandir/colapsar descrição */}
                          {activity.description &&
                            activity.description
                              .replace(/\n?<recurrence>(.*?)<\/recurrence>/, "")
                              .trim() && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDescription(activity.id)}
                                  className="h-7 px-2 text-xs mb-1"
                                >
                                  {expandedDescriptions.has(activity.id)
                                    ? "▼ Ocultar Descrição"
                                    : "▶ Mostrar Descrição"}
                                </Button>

                                {expandedDescriptions.has(activity.id) && (
                                  <InlineRichTextView
                                    content={activity.description
                                      .replace(
                                        /\n?<recurrence>(.*?)<\/recurrence>/,
                                        ""
                                      )
                                      .trim()}
                                    onChange={(html) => {
                                      // Preservar metadados de recorrência ao atualizar
                                      const recurrenceMatch =
                                        activity.description?.match(
                                          /<recurrence>(.*?)<\/recurrence>/
                                        );
                                      const newDescription = recurrenceMatch
                                        ? `${html}\n<recurrence>${recurrenceMatch[1]}</recurrence>`
                                        : html;
                                      onUpdateActivity(activity.id, {
                                        description: newDescription,
                                      });
                                    }}
                                    editable={true}
                                    placeholder="Clique para adicionar descrição..."
                                  />
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            📅 Início:{" "}
                            {format(new Date(activity.date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                          {meta.endDate && (
                            <span>
                              🏁 Fim:{" "}
                              {format(meta.endDate, "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                          {meta.completedDates &&
                            meta.completedDates.length > 0 && (
                              <span>
                                ✅ {meta.completedDates.length} concluídas
                              </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectActivity?.(activity.id)}
                            className="gap-1 h-8 px-2"
                            title="Editar atividade"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                confirm(
                                  "Deseja realmente excluir esta atividade recorrente?"
                                )
                              ) {
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="gap-1 h-8 px-2 text-destructive hover:text-destructive"
                            title="Excluir atividade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {recurringActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem atividades recorrentes.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Activity Dialog */}
      <Dialog open={showCreateForm} onOpenChange={onCloseCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>

          {/* Conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Digite o título da atividade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente*</Label>
                {!showNewClientForm ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => {
                        if (value === "__new__") {
                          setShowNewClientForm(true);
                        } else {
                          setFormData((prev) => ({ ...prev, clientId: value }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients
                          .filter((c) => c.isActive)
                          .map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        <SelectItem value="__new__" className="font-semibold text-primary">
                          + Cadastrar novo cliente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Novo Cliente</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewClientForm(false);
                          setNewClientName("");
                        }}
                        className="h-6 px-2"
                      >
                        Cancelar
                      </Button>
                    </div>
                    <Input
                      placeholder="Nome do cliente"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newClientName.trim() && onCreateClient) {
                          e.preventDefault();
                          // Criar o cliente
                          const usedColors = clients.map(c => c.colorIndex || 1);
                          let nextColor = 1;
                          while (usedColors.includes(nextColor) && nextColor <= 10) {
                            nextColor++;
                          }
                          onCreateClient({
                            name: newClientName.trim(),
                            colorIndex: nextColor <= 10 ? nextColor : 1,
                            notes: "",
                            isActive: true,
                          });
                          setShowNewClientForm(false);
                          setNewClientName("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newClientName.trim() && onCreateClient) {
                          // Criar o cliente
                          const usedColors = clients.map(c => c.colorIndex || 1);
                          let nextColor = 1;
                          while (usedColors.includes(nextColor) && nextColor <= 10) {
                            nextColor++;
                          }
                          onCreateClient({
                            name: newClientName.trim(),
                            colorIndex: nextColor <= 10 ? nextColor : 1,
                            notes: "",
                            isActive: true,
                          });
                          setShowNewClientForm(false);
                          setNewClientName("");
                        }
                      }}
                      disabled={!newClientName.trim()}
                      className="w-full"
                    >
                      Criar Cliente
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Responsável Principal */}
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsável Principal*</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, assigneeId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Data</Label>
                <DatePicker
                  value={formData.dueDate}
                  onChange={(date) => {
                    if (date) {
                      setFormData((prev) => ({ ...prev, dueDate: date }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <RichTextEditor
                content={formData.description}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, description: html }))
                }
                placeholder="Descreva a atividade com detalhes, checklists, listas..."
              />
            </div>

            {/* Recorrência */}
            <div className="space-y-3 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <Label>Recorrência</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isRecurring">Ativar</Label>
                  <input
                    id="isRecurring"
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isRecurring: e.target.checked,
                      }))
                    }
                  />
                </div>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(value) =>
                        setFormData((prev) => {
                          const newType = value as
                            | "daily"
                            | "weekly"
                            | "monthly";
                          return {
                            ...prev,
                            recurrenceType: newType,
                            weekDays:
                              newType === "weekly" && prev.weekDays.length === 0
                                ? [prev.dueDate.getDay()]
                                : prev.weekDays,
                            monthDay:
                              newType === "monthly"
                                ? prev.dueDate.getDate()
                                : prev.monthDay,
                          };
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Até</Label>
                    <DatePicker
                      value={formData.endDate}
                      onChange={(date) => {
                        if (date) {
                          setFormData((prev) => ({ ...prev, endDate: date }));
                        }
                      }}
                    />
                  </div>

                  {formData.recurrenceType === "weekly" && (
                    <div className="space-y-2 col-span-2">
                      <Label>Dias da semana</Label>
                      <div className="grid grid-cols-7 gap-1">
                        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant={
                              formData.weekDays.includes(i)
                                ? "default"
                                : "outline"
                            }
                            className="h-8"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                weekDays: prev.weekDays.includes(i)
                                  ? prev.weekDays.filter((x) => x !== i)
                                  : [...prev.weekDays, i],
                              }))
                            }
                          >
                            {d}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.recurrenceType === "monthly" && (
                    <div className="space-y-2 col-span-2">
                      <Label>Dia do mês</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={formData.monthDay}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            monthDay: Math.min(
                              31,
                              Math.max(1, Number(e.target.value) || 1)
                            ),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        A tarefa se repetirá todo dia {formData.monthDay} de cada mês
                      </p>
                    </div>
                  )}

                  {formData.isRecurring &&
                    formData.recurrenceType === "daily" && (
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          id="includeWeekends"
                          type="checkbox"
                          checked={formData.includeWeekends}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              includeWeekends: e.target.checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor="includeWeekends"
                          className="cursor-pointer"
                        >
                          Incluir finais de semana
                        </Label>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé fixo com botões */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
            <Button variant="outline" onClick={onCloseCreateForm}>
              Cancelar
            </Button>
            <Button onClick={handleCreateActivity}>Criar Atividade</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Activity Details Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={onClearSelectedActivity}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Detalhes da Atividade</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <>
              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Grid de duas colunas - responsivo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coluna Esquerda - Apenas Título e Descrição */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input 
                      value={editData.title} 
                      onChange={(e) => setEditData(prev => ({...prev, title: e.target.value}))} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <RichTextEditor
                      content={editData.description}
                      onChange={(html) => setEditData(prev => ({...prev, description: html}))}
                      placeholder="Descreva a atividade com detalhes, checklists, listas..."
                    />
                  </div>
                </div>
                
                {/* Coluna Direita - Todos os outros campos */}
                <div className="space-y-4">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">Cliente</Label>
                    {!showNewClientForm ? (
                      <div className="flex gap-2">
                        <Select 
                          value={editData.clientId} 
                          onValueChange={(value) => {
                            if (value === "__new__") {
                              setShowNewClientForm(true);
                            } else {
                              setEditData(prev => ({ ...prev, clientId: value }));
                            }
                          }}
                        >
                          <SelectTrigger id="edit-client">
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.filter(c => c.isActive).map((client) => (
                              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                            <SelectItem value="__new__" className="font-semibold text-primary">
                              + Cadastrar novo cliente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Novo Cliente</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNewClientForm(false);
                              setNewClientName("");
                            }}
                            className="h-6 px-2"
                          >
                            Cancelar
                          </Button>
                        </div>
                        <Input
                          placeholder="Nome do cliente"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newClientName.trim() && onCreateClient) {
                              e.preventDefault();
                              // Criar o cliente
                              const usedColors = clients.map(c => c.colorIndex || 1);
                              let nextColor = 1;
                              while (usedColors.includes(nextColor) && nextColor <= 10) {
                                nextColor++;
                              }
                              onCreateClient({
                                name: newClientName.trim(),
                                colorIndex: nextColor <= 10 ? nextColor : 1,
                                notes: "",
                                isActive: true,
                              });
                              setShowNewClientForm(false);
                              setNewClientName("");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newClientName.trim() && onCreateClient) {
                              // Criar o cliente
                              const usedColors = clients.map(c => c.colorIndex || 1);
                              let nextColor = 1;
                              while (usedColors.includes(nextColor) && nextColor <= 10) {
                                nextColor++;
                              }
                              onCreateClient({
                                name: newClientName.trim(),
                                colorIndex: nextColor <= 10 ? nextColor : 1,
                                notes: "",
                                isActive: true,
                              });
                              setShowNewClientForm(false);
                              setNewClientName("");
                            }
                          }}
                          disabled={!newClientName.trim()}
                          className="w-full"
                        >
                          Criar Cliente
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Data</Label>
                    <DatePicker
                      value={editData.date}
                      onChange={(date) => {
                        if (date) {
                          setEditData((prev) => ({ ...prev, date }));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-assignee">Responsável Principal</Label>
                    <Select 
                      value={editData.assignedTo} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, assignedTo: value }))}
                    >
                      <SelectTrigger id="edit-assignee">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Recorrência */}
                  <div className="space-y-3 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <Label>Recorrência</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="editRecurrenceToggle">Ativar</Label>
                        <input 
                          id="editRecurrenceToggle" 
                          type="checkbox" 
                          checked={recurrenceEdit.enabled} 
                          onChange={(e) => setRecurrenceEdit(r => ({...r, enabled: e.target.checked}))} 
                        />
                      </div>
                    </div>
                    {recurrenceEdit.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select 
                            value={recurrenceEdit.type} 
                            onValueChange={(v) => {
                              const newType = v as 'daily' | 'weekly' | 'monthly';
                              setRecurrenceEdit(r => ({
                                ...r,
                                type: newType,
                                weekDays: newType === 'weekly' && r.weekDays.length === 0
                                  ? [new Date(editData.date).getDay()]
                                  : r.weekDays,
                                monthDay: newType === 'monthly'
                                  ? new Date(editData.date).getDate()
                                  : r.monthDay,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Diária</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Até</Label>
                          <DatePicker
                            value={recurrenceEdit.endDate}
                            onChange={(date) => {
                              if (date) {
                                setRecurrenceEdit((prev) => ({
                                  ...prev,
                                  endDate: date,
                                }));
                              }
                            }}
                          />
                        </div>
                        {recurrenceEdit.type === 'weekly' && (
                          <div className="space-y-2 col-span-2">
                            <Label>Dias da semana</Label>
                            <div className="grid grid-cols-7 gap-1">
                              {['D','S','T','Q','Q','S','S'].map((d,i) => (
                                <Button 
                                  key={i} 
                                  type="button" 
                                  variant={recurrenceEdit.weekDays.includes(i) ? 'default' : 'outline'} 
                                  className="h-8"
                                  onClick={() => setRecurrenceEdit(r => ({
                                    ...r, 
                                    weekDays: r.weekDays.includes(i) 
                                      ? r.weekDays.filter(x=>x!==i) 
                                      : [...r.weekDays, i]
                                  }))}
                                >
                                  {d}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {recurrenceEdit.type === 'monthly' && (
                          <div className="space-y-2 col-span-2">
                            <Label>Dia do mês</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={recurrenceEdit.monthDay}
                              onChange={(e) => {
                                const value = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                                setRecurrenceEdit(prev => ({ ...prev, monthDay: value }));
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              A tarefa se repetirá todo dia {recurrenceEdit.monthDay} de cada mês
                            </p>
                          </div>
                        )}
                        {recurrenceEdit.type === 'daily' && (
                          <div className="space-y-2 col-span-2 flex items-center gap-2">
                            <input
                              id="editIncludeWeekends"
                              type="checkbox"
                              checked={recurrenceEdit.includeWeekends}
                              onChange={(e) => setRecurrenceEdit(r => ({ ...r, includeWeekends: e.target.checked }))}
                            />
                            <Label htmlFor="editIncludeWeekends" className="cursor-pointer">
                              Incluir finais de semana
                            </Label>
                          </div>
                        )}
                        {recurrenceEdit.completedDates.length > 0 && (
                          <div className="col-span-2 text-xs text-muted-foreground">
                            Ocorrências concluídas: {recurrenceEdit.completedDates.length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  
                  <div className="space-y-2">
                    <Label>Status Atual</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => {
                        const isActive = editData.status === value;
                        return (
                          <Badge
                            key={value}
                            variant={isActive ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-all',
                              isActive && 'ring-2 ring-primary'
                            )}
                            onClick={() => setEditData(prev => ({...prev, status: value as Activity['status']}))}
                          >
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>
              
              {/* Rodapé fixo com botões */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Deseja realmente excluir esta atividade?")) {
                      onDeleteActivity(selectedActivity.id);
                      onClearSelectedActivity?.();
                    }
                  }}
                >
                  Excluir
                </Button>
                <Button onClick={handleSaveEdit}>
                  Salvar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
