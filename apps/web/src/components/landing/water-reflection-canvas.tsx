"use client";

import React, { useEffect, useRef } from "react";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface WaterReflectionCanvasProps {
  className?: string;
  triggerRipple?: number; // Increment to trigger a programmatic water droplet ripple
}

export function WaterReflectionCanvas({
  className = "",
  triggerRipple,
}: WaterReflectionCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastTriggerRef = useRef<number | undefined>(triggerRipple);

  // Trigger a water ripple when triggerRipple changes (e.g. on new message or scroll)
  useEffect(() => {
    if (triggerRipple !== undefined && triggerRipple !== lastTriggerRef.current) {
      lastTriggerRef.current = triggerRipple;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const x = canvas.width * (0.35 + Math.random() * 0.3);
      const y = canvas.height * (0.6 + Math.random() * 0.25);
      ripplesRef.current.push({
        x,
        y,
        radius: 4,
        maxRadius: Math.min(canvas.width, canvas.height) * 0.45,
        alpha: 0.55,
        speed: 1.8,
      });
    }
  }, [triggerRipple]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse interactive ripples
    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (Math.random() > 0.65 && ripplesRef.current.length < 18) {
        ripplesRef.current.push({
          x,
          y,
          radius: 2,
          maxRadius: 100 + Math.random() * 60,
          alpha: 0.4,
          speed: 1.4,
        });
      }
    };

    canvas.parentElement?.addEventListener("mousemove", handlePointerMove);

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Water Caustics Shimmer (Refraction patterns on dark water bed)
      const causticsGradient = ctx.createRadialGradient(
        width * 0.45,
        height * 0.7,
        20,
        width * 0.45,
        height * 0.7,
        width * 0.6
      );
      causticsGradient.addColorStop(0, "rgba(16, 185, 129, 0.08)");
      causticsGradient.addColorStop(0.4, "rgba(6, 182, 212, 0.04)");
      causticsGradient.addColorStop(1, "rgba(11, 20, 26, 0)");
      ctx.fillStyle = causticsGradient;
      ctx.fillRect(0, 0, width, height);

      // Render organic fluid caustic webs (water surface light refraction)
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(45, 212, 191, 0.06)";
      ctx.lineWidth = 1.2;

      for (let i = 0; i < 4; i++) {
        const offset = i * 28 + Math.sin(time + i) * 12;
        const waveY = height * 0.68 + Math.cos(time * 0.8 + i) * 16;
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        for (let x = 0; x <= width; x += 35) {
          const cy =
            waveY +
            Math.sin((x + offset) * 0.015 + time * 1.2) * 14 +
            Math.cos((x - offset) * 0.022 + time * 0.9) * 8;
          ctx.lineTo(x, cy);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 2. Expanding Water Ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += r.speed;
        r.alpha *= 0.978;

        if (r.alpha < 0.01 || r.radius >= r.maxRadius) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        // Concentric fluid ripple double-crest
        ctx.save();
        ctx.beginPath();
        // Slightly elliptical to match perspective view
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(52, 211, 153, ${r.alpha * 0.65})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Secondary subtle trailing echo wave
        if (r.radius > 15) {
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.radius * 0.78, r.radius * 0.78 * 0.42, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${r.alpha * 0.35})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.parentElement?.removeEventListener("mousemove", handlePointerMove);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${className}`}
    />
  );
}
