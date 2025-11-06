import { Activity, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, CheckCircle, X, Edit, Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingTimerProps {
  activity: Activity;
  client: Client;
  timerSeconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onChangeStatus: (status: Activity['status']) => void;
  onEdit: () => void;
  onClose: () => void;
  formatTimer: (seconds: number) => string;
}

type SizeMode = 'small' | 'medium' | 'large';

const SIZE_CONFIG = {
  small: { width: 280, timerSize: 'text-2xl', padding: 'p-3' },
  medium: { width: 380, timerSize: 'text-4xl', padding: 'p-4' },
  large: { width: 480, timerSize: 'text-5xl', padding: 'p-5' },
};

export function FloatingTimer({
  activity,
  client,
  timerSeconds,
  isRunning,
  onStart,
  onPause,
  onChangeStatus,
  onEdit,
  onClose,
  formatTimer,
}: FloatingTimerProps) {
  const [sizeMode, setSizeMode] = useState<SizeMode>('medium');
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const animationFrameRef = useRef<number>();
  
  // Refs para valores atualizados em tempo real
  const timerSecondsRef = useRef(timerSeconds);
  const isRunningRef = useRef(isRunning);
  
  // Atualizar refs quando props mudarem
  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
  }, [timerSeconds]);
  
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const currentSize = SIZE_CONFIG[sizeMode];

  const cycleSizeMode = () => {
    const modes: SizeMode[] = ['small', 'medium', 'large'];
    const currentIndex = modes.indexOf(sizeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSizeMode(modes[nextIndex]);
  };

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + P: Play/Pausar
      if (e.altKey && e.code === 'KeyP' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (activity.status === 'pending') {
          onStart();
          setLastAction('▶ Iniciado');
        } else if (activity.status === 'doing') {
          if (isRunning) {
            onPause();
            setLastAction('⏸ Pausado');
          } else {
            onStart();
            setLastAction('▶ Retomado');
          }
        }
        setTimeout(() => setLastAction(''), 2000);
      }
      
      // Alt + F: Finalizar/Concluir
      if (e.altKey && e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onChangeStatus('completed');
        setLastAction('✅ Concluído');
        setTimeout(() => setLastAction(''), 2000);
      }
      
      // Alt + E: Editar
      if (e.altKey && e.code === 'KeyE' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onEdit();
        setLastAction('✏️ Editando...');
        setTimeout(() => setLastAction(''), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activity.status, isRunning, onStart, onPause, onChangeStatus, onEdit]);

  // Ativar Picture-in-Picture
  const enablePictureInPicture = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Configurar canvas
      canvas.width = 400;
      canvas.height = 240;

      // Função para desenhar no canvas
      const drawTimer = () => {
        // Usar valores atuais das refs
        const currentSeconds = timerSecondsRef.current;
        const currentIsRunning = isRunningRef.current;

        // Fundo gradiente
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Nome da atividade
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        const title = activity.title.length > 30 ? activity.title.substring(0, 30) + '...' : activity.title;
        ctx.fillText(title, canvas.width / 2, 40);

        // Cliente
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(client.name, canvas.width / 2, 65);

        // Timer - grande e centralizado
        ctx.font = 'bold 64px monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const timerText = formatTimer(currentSeconds);
        ctx.fillText(timerText, canvas.width / 2, 140);

        // Label
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('TEMPO DECORRIDO', canvas.width / 2, 165);

        // Status
        const statusLabel = currentIsRunning ? '▶ RODANDO' : '⏸ PAUSADO';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = currentIsRunning ? '#22c55e' : '#fbbf24';
        ctx.fillText(statusLabel, canvas.width / 2, 195);

        // Instrução com atalhos
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'left';
        ctx.fillText('Alt + P: Play/Pause', 10, 210);
        ctx.fillText('Alt + F: Finalizar', 10, 225);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Alt + C: Cliente | Alt + T: Equipe | Alt + E: Editar', canvas.width / 2, 225);

        // Continuar animação
        animationFrameRef.current = requestAnimationFrame(drawTimer);
      };

      // Desenhar inicialmente
      drawTimer();

      // Capturar stream do canvas
      const stream = canvas.captureStream(30); // 30 FPS
      video.srcObject = stream;
      await video.play();

      // Ativar PiP
      if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPiPActive(true);

        // Limpar quando sair do PiP
        video.addEventListener('leavepictureinpicture', () => {
          setIsPiPActive(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        }, { once: true });
      } else {
        alert('Picture-in-Picture não é suportado neste navegador.');
      }
    } catch (error) {
      console.error('Erro ao ativar Picture-in-Picture:', error);
      alert('Erro ao ativar Picture-in-Picture. Certifique-se de que seu navegador suporta esta funcionalidade.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 z-[9999]"
      >
        <Card
          className="shadow-2xl border-2 border-l-4 transition-all duration-300"
          style={{
            width: `${currentSize.width}px`,
            borderLeftColor: `hsl(var(--client-${client.colorIndex}))`,
          }}
        >
          {/* Canvas e Video escondidos (usados apenas para PiP) */}
          <canvas ref={canvasRef} className="hidden" />
          <video ref={videoRef} className="hidden" muted playsInline />

          {/* Barra de controle superior */}
          <div className="flex items-center justify-between p-2 border-b bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: isRunning ? [1, 1.2, 1] : 1 }}
                transition={{ repeat: isRunning ? Infinity : 0, duration: 1.5 }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(var(--client-${client.colorIndex}))` }}
              />
              <span className="text-xs font-medium truncate max-w-[160px]">
                {activity.title}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={enablePictureInPicture}
                className={cn(
                  "h-6 w-6 p-0",
                  isPiPActive && "bg-primary/20 text-primary"
                )}
                title="Ativar Picture-in-Picture (janela flutuante nativa)"
              >
                <PictureInPicture2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cycleSizeMode}
                className="h-6 w-6 p-0"
                title={`Tamanho: ${sizeMode}`}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-6 w-6 p-0 hover:bg-destructive/20"
                title="Fechar"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Conteúdo (oculto quando minimizado) */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={cn('space-y-3', currentSize.padding)}>
                  {/* Informações da atividade */}
                  {sizeMode !== 'small' && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{client.name}</span>
                      </div>
                      {sizeMode === 'large' && activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.description.replace(/\n?<recurrence>(.*?)<\/recurrence>/, '').trim()}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Timer grande com animação */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20"
                  >
                    <motion.div
                      animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                      transition={{ repeat: isRunning ? Infinity : 0, duration: 1 }}
                      className={cn('font-mono font-bold', currentSize.timerSize)}
                    >
                      {formatTimer(timerSeconds)}
                    </motion.div>
                    {sizeMode !== 'small' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Tempo decorrido
                      </div>
                    )}
                    
                    {/* Feedback de ação de teclado */}
                    <AnimatePresence>
                      {lastAction && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium shadow-lg"
                        >
                          {lastAction}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Botões de controle */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    {/* Linha 1: Play/Pause */}
                    <div className="flex gap-2">
                      {activity.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={onStart}
                          className="flex-1 gap-1"
                        >
                          <Play className="w-3 h-3" />
                          {sizeMode !== 'small' && 'Iniciar'}
                        </Button>
                      )}

                      {activity.status === 'doing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onPause}
                          className="flex-1 gap-1"
                        >
                          {isRunning ? (
                            <>
                              <Pause className="w-3 h-3" />
                              {sizeMode !== 'small' && 'Pausar'}
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              {sizeMode !== 'small' && 'Retomar'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Linha 2: Status */}
                    {activity.status === 'doing' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onChangeStatus('completed')}
                          className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {sizeMode === 'large' && 'Concluir'}
                        </Button>
                      </div>
                    )}

                    {/* Linha 3: Editar */}
                    {sizeMode !== 'small' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onEdit}
                        className="w-full gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </Button>
                    )}
                  </motion.div>
                  
                  {/* Painel de atalhos */}
                  {sizeMode === 'large' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="font-semibold mb-1 text-foreground">⌨️ Atalhos de Teclado:</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div><kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">Alt P</kbd> Play/Pause</div>
                          <div><kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">Alt F</kbd> Finalizar</div>
                          <div><kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">Alt E</kbd> Editar</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Versão minimizada - apenas timer */}
          {isMinimized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 text-center"
            >
              <div className="text-2xl font-mono font-bold">
                {formatTimer(timerSeconds)}
              </div>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
