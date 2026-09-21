"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export function HeroCanvasBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width * 0.5,
      y: height * 0.3,
      targetX: width * 0.5,
      targetY: height * 0.3,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // Warm Solar Gold & Platform Emerald photons
    const colors = [
      "rgba(245, 158, 11, ", // Solar Amber
      "rgba(251, 191, 36, ", // Golden sunlight
      "rgba(16, 185, 129, ", // Platform Emerald
      "rgba(252, 211, 77, ", // Warm Solar Yellow
    ];

    const particleCount = Math.min(45, Math.floor((width * height) / 28000));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.4 + 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let tick = 0;

    const render = () => {
      tick++;
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Natural Top Sunbeam Lighting (Sunlight hitting top of screen)
      const sunBeam = ctx.createRadialGradient(
        width * 0.5,
        0,
        10,
        width * 0.5,
        0,
        Math.max(width * 0.6, 500)
      );
      sunBeam.addColorStop(0, "rgba(245, 158, 11, 0.08)");
      sunBeam.addColorStop(0.4, "rgba(16, 185, 129, 0.03)");
      sunBeam.addColorStop(1, "transparent");
      ctx.fillStyle = sunBeam;
      ctx.fillRect(0, 0, width, height);

      // Subtle warm photon particles without neon blur
      particles.forEach((p) => {
        // Natural gentle drift
        p.x += p.vx + Math.sin(tick * 0.01 + p.size) * 0.15;
        p.y += p.vy + Math.cos(tick * 0.01 + p.size) * 0.15;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw clean crisp dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-80"
    />
  );
}
