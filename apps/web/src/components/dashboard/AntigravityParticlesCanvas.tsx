"use client";

import React, { useEffect, useRef } from "react";
import {
  createParticles,
  drawConnections,
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

  const smoothPointerRef = useRef<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
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

      // Densidade generosa de partículas verde esmeralda (180 a 260)
      const count = particleCount ?? Math.min(260, Math.max(160, Math.floor(w * 0.22)));

      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(count, width, height);
      } else {
        const scaleX = w / (canvas.dataset.prevWidth ? Number(canvas.dataset.prevWidth) : w);
        const scaleY = h / (canvas.dataset.prevHeight ? Number(canvas.dataset.prevHeight) : h);
        for (const p of particlesRef.current) {
          p.x *= scaleX;
          p.y *= scaleY;
        }
      }

      canvas.dataset.prevWidth = String(w);
      canvas.dataset.prevHeight = String(h);
    };

    // 1. ResizeObserver para atualizar dimensões e densidade
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

    // 3. Rastreamento contínuo e responsivo do cursor
    const handlePointerMove = (e: PointerEvent) => {
      const targetElement = container || canvas;
      const rect = targetElement.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const now = performance.now();

      const last = lastPointerPosRef.current;
      const dt = Math.max(1, now - last.time);
      const computedVx = ((currentX - last.x) / dt) * 14;
      const computedVy = ((currentY - last.y) / dt) * 14;

      pointerStateRef.current = {
        x: currentX,
        y: currentY,
        isActive: true,
        vx: Math.max(-18, Math.min(18, computedVx)),
        vy: Math.max(-18, Math.min(18, computedVy)),
      };

      if (smoothPointerRef.current.x === -9999) {
        smoothPointerRef.current = { x: currentX, y: currentY };
      }

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
      smoothPointerRef.current = {
        x: -9999,
        y: -9999,
      };
    };

    if (container) {
      container.addEventListener("pointermove", handlePointerMove, {
        passive: true,
        capture: true,
      });
      container.addEventListener("pointerleave", handlePointerLeave, {
        passive: true,
        capture: true,
      });
    }

    // 4. Renderização estática para acessibilidade
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

        // Efeito de halo/aura esmeralda translúcida que acompanha o mouse
        if (pointer.isActive) {
          const smooth = smoothPointerRef.current;
          smooth.x += (pointer.x - smooth.x) * 0.25;
          smooth.y += (pointer.y - smooth.y) * 0.25;

          const aura = ctx.createRadialGradient(smooth.x, smooth.y, 0, smooth.x, smooth.y, 160);
          aura.addColorStop(0, "rgba(52, 211, 153, 0.12)");
          aura.addColorStop(0.4, "rgba(16, 185, 129, 0.05)");
          aura.addColorStop(1, "rgba(16, 185, 129, 0)");
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(smooth.x, smooth.y, 160, 0, Math.PI * 2);
          ctx.fill();
        }

        // Teias de energia esmeralda entre partículas vizinhas e o cursor
        drawConnections(ctx, particles, pointer, 52);

        // Atualização e renderização das partículas verde esmeralda
        for (let i = 0; i < particles.length; i++) {
          particles[i] = updateParticle(particles[i], pointer, width, height, deltaTime);
          drawParticle(ctx, particles[i]);
        }

        // Amortece velocidade residual do ponteiro
        if (pointer.vx !== undefined && pointer.vy !== undefined) {
          pointer.vx *= 0.88;
          pointer.vy *= 0.88;
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
        container.removeEventListener("pointermove", handlePointerMove, {
          capture: true,
        } as EventListenerOptions);
        container.removeEventListener("pointerleave", handlePointerLeave, {
          capture: true,
        } as EventListenerOptions);
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
