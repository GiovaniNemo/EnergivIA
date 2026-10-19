"use client";

import React, { useEffect, useRef } from "react";
import {
  createAmbientParticles,
  emitRibbonParticles,
  renderParticlesFrame,
  updateAmbientParticles,
  updateRibbonParticles,
  type AmbientParticle,
  type PointerState,
  type TrailParticle,
} from "./antigravity-particles-engine";

interface AntigravityParticlesCanvasProps {
  className?: string;
  particleCount?: number;
  interactiveContainerRef?: React.RefObject<HTMLElement | null>;
}

export function AntigravityParticlesCanvas({
  className,
  particleCount,
  interactiveContainerRef,
}: AntigravityParticlesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ambientParticlesRef = useRef<AmbientParticle[]>([]);
  const trailParticlesRef = useRef<TrailParticle[]>([]);

  const pointerStateRef = useRef<PointerState>({
    x: -9999,
    y: -9999,
    lastX: -9999,
    lastY: -9999,
    isActive: false,
    vx: 0,
    vy: 0,
    speed: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const container = interactiveContainerRef?.current || canvas.parentElement || canvas;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const setupDimensions = (w: number, h: number) => {
      const validW = Math.max(200, Math.floor(w));
      const validH = Math.max(100, Math.floor(h));
      width = validW;
      height = validH;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(validW * dpr);
      canvas.height = Math.floor(validH * dpr);
      canvas.style.width = `${validW}px`;
      canvas.style.height = `${validH}px`;

      const ambientCount = particleCount ?? Math.min(45, Math.max(20, Math.floor(validW * 0.04)));
      if (ambientParticlesRef.current.length === 0) {
        ambientParticlesRef.current = createAmbientParticles(ambientCount, width, height);
      }
    };

    // Inicializa dimensões imediatamente com bounding box atual ou fallback
    const initialRect = container.getBoundingClientRect();
    setupDimensions(initialRect.width || 850, initialRect.height || 180);

    // 1. ResizeObserver para atualizar dimensões em tempo real
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: entryW, height: entryH } = entry.contentRect;
        if (entryW > 0 && entryH > 0) {
          setupDimensions(entryW, entryH);
        }
      }
    });

    resizeObserver.observe(container);

    // 2. Rastreamento universal do ponteiro com captura no container
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // Verifica se está dentro ou muito próximo do card
      const isInside =
        e.clientX >= rect.left - 20 &&
        e.clientX <= rect.right + 20 &&
        e.clientY >= rect.top - 20 &&
        e.clientY <= rect.bottom + 20;

      if (!isInside) {
        pointerStateRef.current.isActive = false;
        return;
      }

      const p = pointerStateRef.current;
      const prevX = p.isActive && p.x > -500 ? p.x : currentX;
      const prevY = p.isActive && p.y > -500 ? p.y : currentY;

      const vx = currentX - prevX;
      const vy = currentY - prevY;
      const speed = Math.hypot(vx, vy);

      p.lastX = prevX;
      p.lastY = prevY;
      p.x = currentX;
      p.y = currentY;
      p.vx = vx;
      p.vy = vy;
      p.speed = speed;
      p.isActive = true;

      // Emite fita leve de partículas que segue o traço do mouse em tempo real
      emitRibbonParticles(trailParticlesRef.current, p);
    };

    const handlePointerLeave = () => {
      pointerStateRef.current.isActive = false;
    };

    container.addEventListener("pointermove", handlePointerMove, { passive: true, capture: true });
    container.addEventListener("pointerleave", handlePointerLeave, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // 3. Loop de animação contínua a 60fps sem travas
    let lastTime = performance.now();
    let frameCount = 0;

    const renderLoop = (time: number) => {
      frameCount++;
      const _deltaTime = Math.min(32, time - lastTime);
      lastTime = time;

      if (ctx && width > 0 && height > 0 && !document.hidden) {
        ctx.save();
        ctx.scale(dpr, dpr);

        const pointer = pointerStateRef.current;

        // Se o mouse estiver se movendo, emite micro-partículas contínuas
        if (pointer.isActive && pointer.speed > 0.8) {
          emitRibbonParticles(trailParticlesRef.current, pointer);
          pointer.speed *= 0.82;
        }

        // Atualiza física da fita de partículas e partículas ambientes
        trailParticlesRef.current = updateRibbonParticles(trailParticlesRef.current, frameCount);
        updateAmbientParticles(ambientParticlesRef.current, pointer, width, height);

        // Renderiza tudo no canvas com alto contraste e nitidez
        renderParticlesFrame(
          ctx,
          width,
          height,
          ambientParticlesRef.current,
          trailParticlesRef.current,
          pointer
        );

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      container.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      } as EventListenerOptions);
      container.removeEventListener("pointerleave", handlePointerLeave, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
    };
  }, [particleCount, interactiveContainerRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 z-[1] h-full w-full"}
    />
  );
}
