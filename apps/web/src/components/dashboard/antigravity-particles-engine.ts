/**
 * Motor de física cinética para o efeito de Rastro Fluido de Partículas (Particle Ribbon / Fluid Comet)
 * em Verde Esmeralda EnergivIA.
 * Cria uma fita dinâmica e densa de partículas que segue e ondula com o movimento do mouse,
 * combinada a partículas ambientes em flutuação contínua.
 */

export const EMERALD_RIBBON_PALETTE = [
  "#FFFFFF", // Brilho estelar puro no núcleo do rastro
  "#A7F3D0", // Emerald 200 (Gelo esmeralda)
  "#6EE7B7", // Emerald 300 (Menta luminoso)
  "#34D399", // Emerald 400 (Esmeralda radiante)
  "#10B981", // Emerald 500 (Verde principal)
  "#059669", // Emerald 600 (Profundidade)
] as const;

export interface TrailParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  curl: number;
}

export interface AmbientParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseAngle: number;
}

export interface PointerState {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  isActive: boolean;
  vx: number;
  vy: number;
  speed: number;
}

let nextParticleId = 0;

/**
 * Cria a coleção de partículas de fundo ambiente que flutuam continuamente pelo card.
 */
export function createAmbientParticles(
  count: number,
  width: number,
  height: number
): AmbientParticle[] {
  const particles: AmbientParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.2 + Math.random() * 0.45;
    const baseAlpha = 0.2 + Math.random() * 0.45;
    const color =
      EMERALD_RIBBON_PALETTE[1 + Math.floor(Math.random() * (EMERALD_RIBBON_PALETTE.length - 1))];

    particles.push({
      id: nextParticleId++,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.0 + Math.random() * 1.6,
      color,
      alpha: baseAlpha,
      baseAlpha,
      pulseSpeed: 0.02 + Math.random() * 0.03,
      pulseAngle: Math.random() * Math.PI * 2,
    });
  }

  return particles;
}

/**
 * Emite uma rajada densa de partículas ao longo do caminho percorrido pelo mouse (Particle Ribbon).
 * Interpola entre a posição anterior e atual do cursor para não deixar falhas em movimentos rápidos.
 */
export function emitRibbonParticles(
  trail: TrailParticle[],
  pointer: PointerState,
  maxTrailLength = 450
): void {
  if (!pointer.isActive) return;

  const dx = pointer.x - pointer.lastX;
  const dy = pointer.y - pointer.lastY;
  const dist = Math.hypot(dx, dy);

  // Determina quantas partículas emitir proporcionalmente à distância e velocidade do movimento
  const steps = Math.min(25, Math.max(3, Math.floor(dist / 3)));
  const particlesPerStep = Math.min(5, Math.max(2, Math.floor(pointer.speed * 0.4) + 1));

  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const posX = pointer.lastX + dx * t;
    const posY = pointer.lastY + dy * t;

    for (let p = 0; p < particlesPerStep; p++) {
      if (trail.length >= maxTrailLength) {
        trail.shift(); // Remove as partículas mais antigas para manter 60fps constantes
      }

      // Direção oposta e perpendicular ao movimento do cursor para criar o efeito de fita/onda
      const spreadAngle = Math.random() * Math.PI * 2;
      const spreadDist = Math.random() * (4 + pointer.speed * 0.8);
      const perpAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.4;

      // Velocidade do rastro fluido
      const vx =
        -Math.cos(perpAngle) * (pointer.speed * 0.15) +
        Math.cos(spreadAngle) * (0.8 + Math.random() * 1.2);
      const vy =
        -Math.sin(perpAngle) * (pointer.speed * 0.15) +
        Math.sin(spreadAngle) * (0.8 + Math.random() * 1.2);

      const maxLife = 35 + Math.floor(Math.random() * 35); // 35 a 70 frames de vida
      const color =
        EMERALD_RIBBON_PALETTE[Math.floor(Math.random() * EMERALD_RIBBON_PALETTE.length)];
      const radius = 1.0 + Math.random() * 2.4; // 1px a 3.4px

      trail.push({
        id: nextParticleId++,
        x: posX + Math.cos(spreadAngle) * spreadDist,
        y: posY + Math.sin(spreadAngle) * spreadDist,
        vx,
        vy,
        radius,
        color,
        alpha: 0.75 + Math.random() * 0.25,
        life: maxLife,
        maxLife,
        curl: (Math.random() - 0.5) * 0.12,
      });
    }
  }
}

/**
 * Atualiza todas as partículas do rastro fluido (Particle Ribbon):
 * - Física de desaceleração suave
 * - Ondulação de vórtice/curling
 * - Decaimento de vida e desvanecimento de opacidade
 */
export function updateRibbonParticles(trail: TrailParticle[], time = 0): TrailParticle[] {
  const alive: TrailParticle[] = [];

  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    p.life--;

    if (p.life > 0) {
      // Ondulação de vórtice natural (curl turbulence)
      p.vx += Math.sin(time * 0.05 + p.y * 0.04) * p.curl;
      p.vy += Math.cos(time * 0.05 + p.x * 0.04) * p.curl;

      // Desaceleração aerodinâmica
      p.vx *= 0.95;
      p.vy *= 0.95;

      p.x += p.vx;
      p.y += p.vy;

      // Decaimento de opacidade suave
      const progress = p.life / p.maxLife;
      p.alpha = Math.pow(progress, 1.2) * 0.9;

      alive.push(p);
    }
  }

  return alive;
}

/**
 * Atualiza partículas ambientes: atração suave quando o cursor está perto, flutuação contínua sem parar.
 */
export function updateAmbientParticles(
  particles: AmbientParticle[],
  pointer: PointerState,
  width: number,
  height: number
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Pulsação suave de brilho
    p.pulseAngle += p.pulseSpeed;
    const pulseFactor = 0.8 + Math.sin(p.pulseAngle) * 0.2;

    if (pointer.isActive) {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      const attractRadius = 180;

      if (dist < attractRadius && dist > 1) {
        const proximity = 1 - dist / attractRadius;
        // Puxa suavemente para dentro do enxame do cursor
        p.vx += (dx / dist) * Math.pow(proximity, 1.5) * 1.2;
        p.vy += (dy / dist) * Math.pow(proximity, 1.5) * 1.2;
        p.alpha = Math.min(0.9, p.baseAlpha + proximity * 0.5);
      } else {
        p.alpha = p.baseAlpha * pulseFactor;
      }
    } else {
      p.alpha = p.baseAlpha * pulseFactor;
    }

    // Atrito suave
    p.vx *= 0.96;
    p.vy *= 0.96;

    // Velocidade mínima constante para nunca ficar estático
    const speed = Math.hypot(p.vx, p.vy);
    const minSpeed = 0.22;
    if (speed < minSpeed && speed > 0.001) {
      const scale = minSpeed / speed;
      p.vx *= scale;
      p.vy *= scale;
    }

    p.x += p.vx;
    p.y += p.vy;

    // Wrap contínuo nas bordas
    const margin = 10;
    if (p.x < -margin) p.x = width + margin;
    else if (p.x > width + margin) p.x = -margin;

    if (p.y < -margin) p.y = height + margin;
    else if (p.y > height + margin) p.y = -margin;
  }
}

/**
 * Renderiza o rastro fluido e as partículas ambientes no canvas.
 */
export function renderParticlesFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ambient: AmbientParticle[],
  trail: TrailParticle[],
  pointer: PointerState
): void {
  ctx.clearRect(0, 0, width, height);

  // 1. Partículas ambientes em verde esmeralda translúcido
  for (let i = 0; i < ambient.length; i++) {
    const p = ambient[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  }

  // 2. Rastro Fluido (Particle Ribbon) com brilho no núcleo
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  }

  // 3. Brilho do cursor quando ativo
  if (pointer.isActive) {
    const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 45);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    glow.addColorStop(0.25, "rgba(52, 211, 153, 0.25)");
    glow.addColorStop(0.7, "rgba(16, 185, 129, 0.08)");
    glow.addColorStop(1, "rgba(16, 185, 129, 0)");

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 45, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.globalAlpha = 1;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
