import { describe, expect, it } from "vitest";
import {
  createParticles,
  updateParticle,
  ANTIGRAVITY_PALETTE,
  type AntigravityParticle,
  type PointerState,
} from "./antigravity-particles-engine";

describe("antigravity-particles-engine", () => {
  it("deve criar a quantidade especificada de partículas respeitando dimensões e paleta", () => {
    const width = 800;
    const height = 180;
    const count = 50;
    const particles = createParticles(count, width, height);

    expect(particles).toHaveLength(count);

    let dashes = 0;
    let dots = 0;

    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(height);
      expect(ANTIGRAVITY_PALETTE).toContain(p.color);

      if (p.shape === "dash") {
        dashes++;
        expect(p.length).toBeGreaterThanOrEqual(4);
        expect(p.length).toBeLessThanOrEqual(14);
      } else {
        dots++;
        expect(p.radius).toBeGreaterThanOrEqual(0.8);
        expect(p.radius).toBeLessThanOrEqual(2.5);
      }
    }

    // Proporção aproximada esperada: maioria traços (~75%) e minoria pontos (~25%)
    expect(dashes).toBeGreaterThan(dots);
  });

  it("deve repelir a partícula quando o cursor do mouse estiver dentro do raio de influência", () => {
    const p: AntigravityParticle = {
      id: 1,
      x: 100,
      y: 100,
      baseX: 100,
      baseY: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      shape: "dash",
      length: 8,
      thickness: 1.6,
      radius: 1,
      color: "#10B981",
      alpha: 0.5,
      driftAngle: 0,
      driftSpeed: 0.3,
    };

    // Cursor a 30px à esquerda da partícula
    const pointer: PointerState = {
      x: 70,
      y: 100,
      isActive: true,
      vx: 2,
      vy: 0,
    };

    const updated = updateParticle(p, pointer, 800, 200, 16);

    // O cursor está à esquerda (x=70), a partícula está em x=100.
    // A repulsão deve empurrar a partícula ainda mais para a direita (vx > 0, x > 100)
    expect(updated.vx).toBeGreaterThan(0);
    expect(updated.x).toBeGreaterThan(100);
  });

  it("não deve sofrer repulsão quando o cursor estiver fora do raio de influência ou inativo", () => {
    const p: AntigravityParticle = {
      id: 2,
      x: 100,
      y: 100,
      baseX: 100,
      baseY: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      shape: "dash",
      length: 8,
      thickness: 1.6,
      radius: 1,
      color: "#06B6D4",
      alpha: 0.5,
      driftAngle: 0,
      driftSpeed: 0.3,
    };

    // Cursor a 400px de distância (bem fora do raio de 140px)
    const pointerFar: PointerState = {
      x: 500,
      y: 500,
      isActive: true,
      vx: 0,
      vy: 0,
    };

    const updatedFar = updateParticle(p, pointerFar, 800, 200, 16);

    // Sem repulsão forte, velocidade deve ficar restrita à suave deriva orgânica
    expect(Math.abs(updatedFar.vx)).toBeLessThan(1);
    expect(Math.abs(updatedFar.vy)).toBeLessThan(1);

    // Cursor inativo
    const pointerInactive: PointerState = {
      x: 105,
      y: 105,
      isActive: false,
      vx: 0,
      vy: 0,
    };

    const updatedInactive = updateParticle(p, pointerInactive, 800, 200, 16);
    expect(Math.abs(updatedInactive.vx)).toBeLessThan(1);
  });

  it("deve amortecer velocidades altas ao longo do tempo (spring & damping)", () => {
    let p: AntigravityParticle = {
      id: 3,
      x: 150,
      y: 100,
      baseX: 100,
      baseY: 100,
      vx: 12, // velocidade inicial alta após repulsão
      vy: 8,
      angle: 0,
      angularVelocity: 0.1,
      shape: "dash",
      length: 8,
      thickness: 1.6,
      radius: 1,
      color: "#F59E0B",
      alpha: 0.5,
      driftAngle: 0,
      driftSpeed: 0.3,
    };

    const pointerInactive: PointerState = {
      x: 0,
      y: 0,
      isActive: false,
      vx: 0,
      vy: 0,
    };

    // Simula 20 frames de amortecimento e retorno por mola
    for (let frame = 0; frame < 20; frame++) {
      p = updateParticle(p, pointerInactive, 800, 200, 16);
    }

    // A velocidade residual deve ser significativamente menor que a inicial (amortecimento)
    expect(Math.abs(p.vx)).toBeLessThan(6);
    expect(Math.abs(p.vy)).toBeLessThan(4);
  });
});
