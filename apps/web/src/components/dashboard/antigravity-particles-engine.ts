/**
 * Motor de física cinética vetorial para partículas Verde Esmeralda EnergivIA.
 * Sistema de enxame vivo de alta densidade que segue, orbita e reage dinamicamente ao cursor do mouse.
 */

export const ANTIGRAVITY_PALETTE = [
  "#10B981", // Emerald 500
  "#34D399", // Emerald 400 (Mint brilhante)
  "#059669", // Emerald 600 (Profundo)
  "#6EE7B7", // Emerald 300 (Glow claro)
  "#A7F3D0", // Emerald 200 (Gelo esmeralda)
  "#047857", // Emerald 700 (Profundidade de campo)
] as const;

export type ParticleShape = "dash" | "dot";

export interface AntigravityParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  shape: ParticleShape;
  length: number;
  thickness: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
}

export interface PointerState {
  x: number;
  y: number;
  isActive: boolean;
  vx?: number;
  vy?: number;
}

/**
 * Cria uma coleção densa de partículas verde esmeralda distribuídas no canvas.
 */
export function createParticles(
  count: number,
  width: number,
  height: number
): AntigravityParticle[] {
  const particles: AntigravityParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 60% pontos luminosos, 40% traços de energia esmeralda
    const isDash = i % 5 === 0 || i % 5 === 2;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = ANTIGRAVITY_PALETTE[Math.floor(Math.random() * ANTIGRAVITY_PALETTE.length)];
    const speed = 0.3 + Math.random() * 0.7;
    const moveAngle = Math.random() * Math.PI * 2;
    const baseAlpha = 0.25 + Math.random() * 0.55;

    particles.push({
      id: i,
      x,
      y,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      angle: moveAngle,
      angularVelocity: (Math.random() - 0.5) * 0.04,
      shape: isDash ? "dash" : "dot",
      length: isDash ? 4 + Math.random() * 5 : 0, // 4px a 9px
      thickness: isDash ? 1.0 + Math.random() * 0.6 : 0, // 1px a 1.6px
      radius: isDash ? 0 : 1.1 + Math.random() * 1.4, // 1.1px a 2.5px
      color,
      alpha: baseAlpha,
      baseAlpha,
    });
  }

  return particles;
}

/**
 * Atualiza o estado físico das partículas:
 * - Movimento contínuo orgânico fluido (sem posições estáticas presas)
 * - Atração magnética e seguimento dinâmico ao cursor ("vai junto com o mouse")
 * - Vórtice e turbulência suave que fazem o enxame dançar ao redor do ponteiro
 * - Limite de velocidade e wrap suave nas bordas
 */
export function updateParticle(
  p: AntigravityParticle,
  pointer: PointerState,
  width: number,
  height: number,
  _deltaTime = 16
): AntigravityParticle {
  const copy: AntigravityParticle = { ...p };

  // 1. Interação dinâmica com o cursor (Atração, Rastro e Vórtice)
  if (pointer.isActive) {
    const dx = pointer.x - copy.x;
    const dy = pointer.y - copy.y;
    const dist = Math.hypot(dx, dy);
    const influenceRadius = 220; // Amplo raio de captura magnética

    if (dist < influenceRadius && dist > 1) {
      const proximity = 1 - dist / influenceRadius;
      const nx = dx / dist;
      const ny = dy / dist;

      // Força de atração em direção ao cursor (para "ir junto")
      const attractForce = Math.pow(proximity, 1.2) * 1.8;
      copy.vx += nx * attractForce;
      copy.vy += ny * attractForce;

      // Força de rotação/vórtice suave (swirl em espiral)
      const swirlForce = proximity * 0.9;
      copy.vx += -ny * swirlForce;
      copy.vy += nx * swirlForce;

      // Momentum do mouse (acompanha o rastro do movimento da mão)
      if (pointer.vx !== undefined && pointer.vy !== undefined) {
        copy.vx += pointer.vx * 0.22 * proximity;
        copy.vy += pointer.vy * 0.22 * proximity;
      }

      // Intensifica o brilho da partícula quando próxima do mouse
      copy.alpha = Math.min(0.95, copy.baseAlpha + proximity * 0.45);
    } else {
      // Retorna gradualmente ao brilho natural
      copy.alpha += (copy.baseAlpha - copy.alpha) * 0.05;
    }
  } else {
    copy.alpha += (copy.baseAlpha - copy.alpha) * 0.05;
  }

  // 2. Atrito aerodinâmico fluido (damping suave que preserva o fluxo vivo)
  const friction = pointer.isActive ? 0.94 : 0.97;
  copy.vx *= friction;
  copy.vy *= friction;

  // Garante velocidade mínima para nunca ficar congelado/estático
  const currentSpeed = Math.hypot(copy.vx, copy.vy);
  const minSpeed = 0.25;
  const maxSpeed = 7.5;

  if (currentSpeed < minSpeed && currentSpeed > 0.001) {
    const scale = minSpeed / currentSpeed;
    copy.vx *= scale;
    copy.vy *= scale;
  } else if (currentSpeed > maxSpeed) {
    const scale = maxSpeed / currentSpeed;
    copy.vx *= scale;
    copy.vy *= scale;
  }

  // 3. Atualiza posição
  copy.x += copy.vx;
  copy.y += copy.vy;

  // 4. Rotação do traço alinhada com o vetor de movimento
  if (currentSpeed > 0.3) {
    const targetAngle = Math.atan2(copy.vy, copy.vx);
    copy.angle += (targetAngle - copy.angle) * 0.12;
  } else {
    copy.angle += copy.angularVelocity;
  }

  // 5. Wrap contínuo nas bordas (as partículas circulam infinitamente pelo card)
  const margin = 15;
  if (copy.x < -margin) copy.x = width + margin;
  else if (copy.x > width + margin) copy.x = -margin;

  if (copy.y < -margin) copy.y = height + margin;
  else if (copy.y > height + margin) copy.y = -margin;

  return copy;
}

/**
 * Renderiza uma partícula individual no contexto do Canvas 2D.
 */
export function drawParticle(ctx: CanvasRenderingContext2D, p: AntigravityParticle): void {
  ctx.save();

  if (p.shape === "dash") {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineWidth = p.thickness;
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.moveTo(-p.length / 2, 0);
    ctx.lineTo(p.length / 2, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Desenha teias de conexão suaves entre partículas vizinhas e entre o cursor e as partículas.
 */
export function drawConnections(
  ctx: CanvasRenderingContext2D,
  particles: AntigravityParticle[],
  pointer: PointerState,
  maxDistance = 55
): void {
  const len = particles.length;

  for (let i = 0; i < len; i++) {
    const p1 = particles[i];

    // Conexão delicada com o cursor
    if (pointer.isActive) {
      const pdx = pointer.x - p1.x;
      const pdy = pointer.y - p1.y;
      const pDist = Math.hypot(pdx, pdy);
      const cursorMaxDist = 110;

      if (pDist < cursorMaxDist) {
        const lineAlpha = (1 - pDist / cursorMaxDist) * 0.22;
        ctx.beginPath();
        ctx.strokeStyle = "#34D399";
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 0.8;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }

    // Conexões sutis entre partículas próximas
    for (let j = i + 1; j < len; j++) {
      const p2 = particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.hypot(dx, dy);

      if (dist < maxDistance) {
        const lineAlpha = (1 - dist / maxDistance) * 0.12;
        ctx.beginPath();
        ctx.strokeStyle = "#10B981";
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 0.6;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
}
