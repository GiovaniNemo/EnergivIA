import { describe, expect, it } from "vitest";
import {
  createParticles,
  updateParticle,
  ANTIGRAVITY_PALETTE,
  type AntigravityParticle,
  type PointerState,
} from "./antigravity-particles-engine";

describe("antigravity-particles-engine (verde esmeralda dinâmico)", () => {
  it("deve criar partículas estritamente na paleta verde esmeralda EnergivIA", () => {
    const width = 800;
    const height = 180;
    const count = 180;
    const particles = createParticles(count, width, height);

    expect(particles).toHaveLength(count);

    // Todas as cores devem ser tons de verde esmeralda
    const emeraldPrefixes = ["#10B981", "#34D399", "#059669", "#6EE7B7", "#A7F3D0", "#047857"];

    for (const p of particles) {
      expect(emeraldPrefixes).toContain(p.color);
      expect(ANTIGRAVITY_PALETTE).toContain(p.color);
      expect(p.alpha).toBeGreaterThan(0.1);
      // Nunca nasce com velocidade 0 (sempre dinâmico)
      const initialSpeed = Math.hypot(p.vx, p.vy);
      expect(initialSpeed).toBeGreaterThan(0.2);
    }
  });

  it("deve atrair e direcionar a partícula na direção do cursor quando o mouse passa ('vai junto')", () => {
    const p: AntigravityParticle = {
      id: 1,
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      shape: "dot",
      length: 0,
      thickness: 0,
      radius: 1.5,
      color: "#10B981",
      alpha: 0.5,
      baseAlpha: 0.5,
    };

    // Cursor se movendo à direita da partícula (em x=150) com velocidade para a direita
    const pointer: PointerState = {
      x: 150,
      y: 100,
      isActive: true,
      vx: 4,
      vy: 0,
    };

    const updated = updateParticle(p, pointer, 800, 200, 16);

    // Como o cursor está em x=150 (à frente), a atração e o momentum puxam a partícula para a direita (vx > 0)
    expect(updated.vx).toBeGreaterThan(0);
    expect(updated.x).toBeGreaterThan(100);
    // Alpha/brilho aumenta com a proximidade do mouse
    expect(updated.alpha).toBeGreaterThan(0.5);
  });

  it("deve manter movimento contínuo dinâmico sem ficar estático mesmo sem o mouse", () => {
    let p: AntigravityParticle = {
      id: 2,
      x: 100,
      y: 100,
      vx: 0.01, // quase parando
      vy: 0.01,
      angle: 0,
      angularVelocity: 0.01,
      shape: "dash",
      length: 6,
      thickness: 1.2,
      radius: 0,
      color: "#34D399",
      alpha: 0.5,
      baseAlpha: 0.5,
    };

    const pointerInactive: PointerState = {
      x: 0,
      y: 0,
      isActive: false,
    };

    p = updateParticle(p, pointerInactive, 800, 200, 16);

    // O motor impõe velocidade mínima para nunca congelar
    const speed = Math.hypot(p.vx, p.vy);
    expect(speed).toBeGreaterThanOrEqual(0.25);
  });

  it("deve fazer wrap contínuo suave nas bordas para as partículas continuarem circulando", () => {
    const p: AntigravityParticle = {
      id: 3,
      x: 820, // saiu pela direita (width = 800)
      y: 100,
      vx: 2,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      shape: "dot",
      length: 0,
      thickness: 0,
      radius: 1.5,
      color: "#6EE7B7",
      alpha: 0.5,
      baseAlpha: 0.5,
    };

    const pointerInactive: PointerState = {
      x: 0,
      y: 0,
      isActive: false,
    };

    const updated = updateParticle(p, pointerInactive, 800, 200, 16);

    // Reaparece na borda esquerda para continuar circulando infinitamente
    expect(updated.x).toBeLessThan(0);
  });
});
