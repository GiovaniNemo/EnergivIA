import { describe, expect, it } from "vitest";
import {
  createAmbientParticles,
  emitRibbonParticles,
  updateRibbonParticles,
  updateAmbientParticles,
  EMERALD_RIBBON_PALETTE,
  type PointerState,
  type TrailParticle,
} from "./antigravity-particles-engine";

describe("antigravity-particles-engine (rastro fluido de partículas)", () => {
  it("deve criar partículas ambientes na paleta verde esmeralda com velocidade inicial", () => {
    const particles = createAmbientParticles(80, 800, 200);

    expect(particles).toHaveLength(80);

    for (const p of particles) {
      expect(EMERALD_RIBBON_PALETTE).toContain(p.color);
      const speed = Math.hypot(p.vx, p.vy);
      expect(speed).toBeGreaterThan(0.1);
      expect(p.radius).toBeGreaterThanOrEqual(1.0);
      expect(p.radius).toBeLessThanOrEqual(3.0);
    }
  });

  it("deve emitir fita de partículas densas quando o cursor do mouse se move", () => {
    const trail: TrailParticle[] = [];
    const pointer: PointerState = {
      x: 200,
      y: 100,
      lastX: 100,
      lastY: 100,
      isActive: true,
      vx: 15,
      vy: 0,
      speed: 15,
    };

    emitRibbonParticles(trail, pointer, 300);

    // Deve ter emitido dezenas de partículas ao longo do trajeto (fita densa)
    expect(trail.length).toBeGreaterThan(20);

    for (const p of trail) {
      expect(p.x).toBeGreaterThanOrEqual(75);
      expect(p.x).toBeLessThanOrEqual(225);
      expect(EMERALD_RIBBON_PALETTE).toContain(p.color);
      expect(p.life).toBeGreaterThan(0);
      expect(p.alpha).toBeGreaterThan(0.5);
    }
  });

  it("deve decair a vida útil e desvanecer as partículas da fita com o tempo", () => {
    const trail: TrailParticle[] = [
      {
        id: 1,
        x: 100,
        y: 100,
        vx: 2,
        vy: 1,
        radius: 2,
        color: "#10B981",
        alpha: 0.9,
        life: 5,
        maxLife: 40,
        curl: 0.05,
      },
    ];

    // Atualiza 4 frames: vida ainda positiva
    let alive = updateRibbonParticles(trail, 1);
    expect(alive).toHaveLength(1);
    expect(alive[0].life).toBe(4);
    expect(alive[0].alpha).toBeLessThan(0.9); // fade gradual

    // Atualiza mais 4 frames: vida esgota e partícula é eliminada
    for (let f = 0; f < 4; f++) {
      alive = updateRibbonParticles(alive, f);
    }
    expect(alive).toHaveLength(0);
  });

  it("não deve permitir que partículas ambientes congelem ou fiquem estáticas", () => {
    const particles = [
      {
        id: 1,
        x: 100,
        y: 100,
        vx: 0.001,
        vy: 0.001,
        radius: 1.5,
        color: "#34D399",
        alpha: 0.4,
        baseAlpha: 0.4,
        pulseSpeed: 0.02,
        pulseAngle: 0,
      },
    ];

    const inactivePointer: PointerState = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      isActive: false,
      vx: 0,
      vy: 0,
      speed: 0,
    };

    updateAmbientParticles(particles, inactivePointer, 800, 200);

    const speed = Math.hypot(particles[0].vx, particles[0].vy);
    expect(speed).toBeGreaterThanOrEqual(0.2);
  });
});
