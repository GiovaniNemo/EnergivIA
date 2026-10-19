"use client";

import React, { useEffect, useRef } from "react";
import {
  createParticles,
  drawParticle,
  updateParticle,
  type AntigravityParticle,
  type PointerState,
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
  const particlesRef = useRef<AntigravityParticle[]>([]);
  const isVisibleRef = useRef<boolean>(true);
  const pointerStateRef = useRef<PointerState>({
    x: -9999,
    y: -9999,
    isActive: false,
    vx: 0,
    vy: 0,
  });

  const lastPointerPosRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Respeita acessibilidade de movimento reduzido
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Container que receberá os eventos do cursor (ou o parentElement por padrão)
    const container = interactiveContainerRef?.current || canvas.parentElement;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const setupDimensions = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Inicializa ou reescala a densidade de partículas
      const count = particleCount ?? Math.min(90, Math.max(45, Math.floor(w * 0.08)));

      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(count, width, height);
      } else {
        // Re-ancora as partículas existentes aos novos limites
        const scaleX = w / (canvas.dataset.prevWidth ? Number(canvas.dataset.prevWidth) : w);
        const scaleY = h / (canvas.dataset.prevHeight ? Number(canvas.dataset.prevHeight) : h);
        for (const p of particlesRef.current) {
          p.x *= scaleX;
          p.y *= scaleY;
          p.baseX *= scaleX;
          p.baseY *= scaleY;
        }
      }

      canvas.dataset.prevWidth = String(w);
      canvas.dataset.prevHeight = String(h);
    };

    // 1. ResizeObserver para atualizar dimensões do canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: entryW, height: entryH } = entry.contentRect;
        setupDimensions(entryW, entryH);
        if (prefersReducedMotion && ctx) {
          renderStaticFrame();
        }
      }
    });

    if (container) {
      resizeObserver.observe(container);
    } else {
      resizeObserver.observe(canvas);
    }

    // 2. IntersectionObserver para suspender animação fora da tela (0% CPU)
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting && !prefersReducedMotion && !animationFrameRef.current) {
            lastTime = performance.now();
            animationFrameRef.current = requestAnimationFrame(renderLoop);
          } else if (!entry.isIntersecting && animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }
      },
      { threshold: 0.05 }
    );

    if (container) {
      intersectionObserver.observe(container);
    }

    // 3. Rastreamento fluido do cursor do mouse
    const handlePointerMove = (e: PointerEvent) => {
      const targetElement = container || canvas;
      const rect = targetElement.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const now = performance.now();

      const last = lastPointerPosRef.current;
      const dt = Math.max(1, now - last.time);
      const computedVx = ((currentX - last.x) / dt) * 12;
      const computedVy = ((currentY - last.y) / dt) * 12;

      pointerStateRef.current = {
        x: currentX,
        y: currentY,
        isActive: true,
        vx: Math.max(-15, Math.min(15, computedVx)),
        vy: Math.max(-15, Math.min(15, computedVy)),
      };

      lastPointerPosRef.current = {
        x: currentX,
        y: currentY,
        time: now,
      };
    };

    const handlePointerLeave = () => {
      pointerStateRef.current = {
        x: -9999,
        y: -9999,
        isActive: false,
        vx: 0,
        vy: 0,
      };
    };

    if (container) {
      container.addEventListener("pointermove", handlePointerMove, { passive: true });
      container.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    }

    // 4. Renderização estática (para acessibilidade / prefers-reduced-motion)
    const renderStaticFrame = () => {
      if (!ctx || width <= 0 || height <= 0) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        drawParticle(ctx, p);
      }
      ctx.restore();
    };

    // 5. Loop de animação contínua a 60fps
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      if (!isVisibleRef.current) {
        animationFrameRef.current = null;
        return;
      }

      const deltaTime = Math.min(32, time - lastTime);
      lastTime = time;

      if (ctx && width > 0 && height > 0) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const pointer = pointerStateRef.current;
        const particles = particlesRef.current;

        for (let i = 0; i < particles.length; i++) {
          particles[i] = updateParticle(particles[i], pointer, width, height, deltaTime);
          drawParticle(ctx, particles[i]);
        }

        // Amortece o vetor de velocidade residual do cursor
        if (pointer.vx !== undefined && pointer.vy !== undefined) {
          pointer.vx *= 0.85;
          pointer.vy *= 0.85;
        }

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    if (!prefersReducedMotion) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      renderStaticFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (container) {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
        resizeObserver.unobserve(container);
        intersectionObserver.unobserve(container);
      } else {
        resizeObserver.unobserve(canvas);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
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
