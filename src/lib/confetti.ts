import confetti from 'canvas-confetti';

/**
 * Dispara confetes da lateral da tela quando uma atividade é concluída
 */
export const fireConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Confetes saindo do lado esquerdo
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    origin: { x: 0, y: 0.6 },
  });
  fire(0.2, {
    spread: 60,
    origin: { x: 0, y: 0.6 },
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    origin: { x: 0, y: 0.6 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    origin: { x: 0, y: 0.6 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    origin: { x: 0, y: 0.6 },
  });

  // Confetes saindo do lado direito
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    origin: { x: 1, y: 0.6 },
  });
  fire(0.2, {
    spread: 60,
    origin: { x: 1, y: 0.6 },
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    origin: { x: 1, y: 0.6 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    origin: { x: 1, y: 0.6 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    origin: { x: 1, y: 0.6 },
  });
};
