/**
 * Motor de física cinética vetorial para partículas estilo Google Antigravity.
 * Paleta EnergivIA Solar-Tech com traços orientados e micro-pontos reativos ao cursor.
 */

export const ANTIGRAVITY_PALETTE = [
  "#10B981", // Emerald 500
  "#34D399", // Emerald 400 (Mint)
  "#06B6D4", // Cyan 500
  "#14B8A6", // Teal 500
  "#F59E0B", // Amber 500 (Solar Gold)
  "#818CF8", // Indigo 400 (Electric Violet)
] as const;

export type ParticleShape = "dash" | "dot";

export interface AntigravityParticle {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
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
  driftAngle: number;
  driftSpeed: number;
}

export interface PointerState {
  x: number;
  y: number;
  isActive: boolean;
  vx?: number;
  vy?: number;
}

/**
 * Inicializa a coleção de partículas distribuídas organicamente no canvas.
 */
export function createParticles(
  count: number,
  width: number,
  height: number
): AntigravityParticle[] {
  const particles: AntigravityParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 75% traços orientados, 25% micro-pontos estelares
    const isDash = i % 4 !== 0;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = ANTIGRAVITY_PALETTE[Math.floor(Math.random() * ANTIGRAVITY_PALETTE.length)];

    particles.push({
      id: i,
      x,
      y,
      baseX: x,
      baseY: y,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.02,
      shape: isDash ? "dash" : "dot",
      length: isDash ? 5 + Math.random() * 6 : 0, // 5px a 11px
      thickness: isDash ? 1.4 + Math.random() * 0.6 : 0, // 1.4px a 2px
      radius: isDash ? 0 : 0.9 + Math.random() * 0.8, // 0.9px a 1.7px
      color,
      alpha: 0.3 + Math.random() * 0.45, // 0.30 a 0.75
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: 0.2 + Math.random() * 0.3,
    });
  }

  return particles;
}

/**
 * Atualiza o estado físico de uma partícula aplicando deriva, repulsão de cursor e retorno elástico (spring-damping).
 */
export function updateParticle(
  p: AntigravityParticle,
  pointer: PointerState,
  width: number,
  height: number,
  _deltaTime = 16
): AntigravityParticle {
  const copy: AntigravityParticle = { ...p };

  // 1. Deriva orgânica suave em repouso
  copy.driftAngle += copy.driftSpeed * 0.05;
  const targetX = copy.baseX + Math.sin(copy.driftAngle) * 10;
  const targetY = copy.baseY + Math.cos(copy.driftAngle * 0.8) * 7;

  // 2. Interação de repulsão e impulso com o cursor do mouse
  if (pointer.isActive) {
    const dx = copy.x - pointer.x;
    const dy = copy.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    const radius = 140;

    if (dist < radius && dist > 0.001) {
      // Força de repulsão inversamente proporcional à distância
      const proximity = 1 - dist / radius;
      const repulseForce = Math.pow(proximity, 1.5) * 4.5;
      const nx = dx / dist;
      const ny = dy / dist;

      copy.vx += nx * repulseForce;
      copy.vy += ny * repulseForce;

      // Impulso do vetor de velocidade do cursor (vento cinético)
      if (pointer.vx !== undefined && pointer.vy !== undefined) {
        copy.vx += pointer.vx * 0.25 * proximity;
        copy.vy += pointer.vy * 0.25 * proximity;
      }

      // Alinhamento dinâmico do traço com a força do impacto
      const moveAngle = Math.atan2(copy.vy, copy.vx);
      copy.angle += (moveAngle - copy.angle) * 0.15;
    }
  }

  // 3. Retorno elástico (Spring Force) e Amortecimento (Damping)
  const springK = 0.035;
  const damping = 0.88;

  const springFx = (targetX - copy.x) * springK;
  const springFy = (targetY - copy.y) * springK;

  copy.vx = (copy.vx + springFx) * damping;
  copy.vy = (copy.vy + springFy) * damping;

  copy.x += copy.vx;
  copy.y += copy.vy;

  // 4. Rotação
  const speed = Math.hypot(copy.vx, copy.vy);
  if (speed > 0.4) {
    // Quando em movimento veloz, orienta no vetor de aceleração
    const moveAngle = Math.atan2(copy.vy, copy.vx);
    copy.angle += (moveAngle - copy.angle) * 0.1;
  } else {
    // Flutuação serena: rotação contínua sutil
    copy.angle += copy.angularVelocity;
  }

  // 5. Wrap suave nas bordas para partículas não se perderem se empurradas para muito longe
  const margin = 20;
  if (copy.x < -margin) {
    copy.x = width + margin;
    copy.baseX = width - Math.random() * 40;
  } else if (copy.x > width + margin) {
    copy.x = -margin;
    copy.baseX = Math.random() * 40;
  }

  if (copy.y < -margin) {
    copy.y = height + margin;
    copy.baseY = height - Math.random() * 20;
  } else if (copy.y > height + margin) {
    copy.y = -margin;
    copy.baseY = Math.random() * 20;
  }

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
