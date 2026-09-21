"use client";

import React, { useEffect, useRef } from "react";

interface SolarPhoton {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  hue: number;
}

export function HeroCanvasBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;

    const mouse = {
      x: width * 0.8,
      y: height * 0.15,
      targetX: width * 0.8,
      targetY: height * 0.15,
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

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Solar photon dust motes drifting across light beams
    const photonCount = Math.min(50, Math.floor((width * height) / 24000));
    const photons: SolarPhoton[] = Array.from({ length: photonCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.6) * 0.4, // Natural drift towards bottom-left
      vy: Math.random() * 0.35 + 0.1,
      size: Math.random() * 1.8 + 0.7,
      alpha: Math.random() * 0.4 + 0.1,
      baseAlpha: Math.random() * 0.35 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      hue: Math.random() > 0.3 ? 42 : 160, // 42 = soft champagne gold, 160 = subtle emerald
    }));

    let tick = 0;

    // Angular definitions for God Rays (volumetric sunbeams from top-right)
    const rayConfigs = [
      { angleOffset: 0.28, width: 0.14, speed: 0.0006, intensity: 0.065 },
      { angleOffset: 0.48, width: 0.22, speed: 0.0004, intensity: 0.085 },
      { angleOffset: 0.72, width: 0.18, speed: 0.0007, intensity: 0.075 },
      { angleOffset: 0.95, width: 0.25, speed: 0.0005, intensity: 0.09 },
      { angleOffset: 1.22, width: 0.16, speed: 0.0008, intensity: 0.06 },
      { angleOffset: 1.45, width: 0.2, speed: 0.0004, intensity: 0.05 },
    ];

    const render = () => {
      tick++;

      // Smooth scroll interpolation for silky smooth parallax
      scrollY += (targetScrollY - scrollY) * 0.08;

      // Smooth mouse interaction
      mouse.x += (mouse.targetX - mouse.x) * 0.03;
      mouse.y += (mouse.targetY - mouse.y) * 0.03;

      ctx.clearRect(0, 0, width, height);

      // -------------------------------------------------------------
      // 1. DYNAMIC SUN POSITION (Top-Right with Parallax & Mouse Shift)
      // -------------------------------------------------------------
      // Sun position stays anchored at top-right, shifting subtly with scroll
      const sunParallaxY = -40 + scrollY * 0.28;
      const sunMouseOffset = (mouse.x - width * 0.8) * 0.03;
      const sunX = width - 40 + sunMouseOffset;
      const sunY = sunParallaxY;

      // Base radius scaled to viewport
      const sunMaxRadius = Math.max(width * 0.85, 750);

      // -------------------------------------------------------------
      // 2. WARM SOLAR GOD RAYS (Volumetric Beams of Light)
      // -------------------------------------------------------------
      // Less saturated: champagne warm gold (rgba(254, 240, 138, ...)) and soft amber
      const rayOriginAngle = Math.PI * 0.75; // Pointing diagonally down-left

      rayConfigs.forEach((ray, index) => {
        const dynamicAngle =
          rayOriginAngle +
          ray.angleOffset +
          Math.sin(tick * ray.speed + index) * 0.04 -
          scrollY * 0.0004;

        const rayReach = sunMaxRadius * 1.25;
        const halfW = ray.width * 0.5;

        const x1 = sunX + Math.cos(dynamicAngle - halfW) * rayReach;
        const y1 = sunY + Math.sin(dynamicAngle - halfW) * rayReach;
        const x2 = sunX + Math.cos(dynamicAngle + halfW) * rayReach;
        const y2 = sunY + Math.sin(dynamicAngle + halfW) * rayReach;

        // Radial beam gradient
        const beamGrad = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, rayReach);
        // Soft, desaturated, elegant sunlight
        beamGrad.addColorStop(0, `rgba(254, 243, 199, ${ray.intensity * 1.3})`); // Champagne white-gold
        beamGrad.addColorStop(0.3, `rgba(251, 191, 36, ${ray.intensity * 0.75})`); // Soft golden amber
        beamGrad.addColorStop(0.7, `rgba(245, 158, 11, ${ray.intensity * 0.25})`);
        beamGrad.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();
      });

      // -------------------------------------------------------------
      // 3. SOLAR RADIANCE CORE (Natural Sun Glow at Top Right)
      // -------------------------------------------------------------
      const coreGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunMaxRadius);
      // Soft champagne core, fading smoothly across the canvas
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)"); // Intense sun core
      coreGrad.addColorStop(0.04, "rgba(254, 243, 199, 0.5)"); // Warm solar corona
      coreGrad.addColorStop(0.12, "rgba(252, 211, 77, 0.22)"); // Soft golden daylight
      coreGrad.addColorStop(0.28, "rgba(245, 158, 11, 0.09)"); // Atmospheric warm amber
      coreGrad.addColorStop(0.55, "rgba(16, 185, 129, 0.025)"); // Subtle platform emerald undertone
      coreGrad.addColorStop(1, "transparent");

      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // -------------------------------------------------------------
      // 4. OPTICAL LENS FLARE DISCS (Subtle cinematic camera flare)
      // -------------------------------------------------------------
      // Optical axis connects sun (top-right) to center-left
      const targetPointX = width * 0.35;
      const targetPointY = height * 0.65;
      const axisDx = targetPointX - sunX;
      const axisDy = targetPointY - sunY;

      // 3 soft, desaturated lens flare discs that shift smoothly with scroll
      const flares = [
        { progress: 0.25, radius: 45, alpha: 0.08, r: 254, g: 240, b: 138 },
        { progress: 0.45, radius: 95, alpha: 0.05, r: 251, g: 191, b: 36 },
        { progress: 0.72, radius: 60, alpha: 0.04, r: 16, g: 185, b: 129 },
      ];

      flares.forEach((flare) => {
        // Subtle floating movement and parallax
        const flareOffset = Math.sin(tick * 0.015 + flare.progress * 10) * 8;
        const fx = sunX + axisDx * flare.progress + flareOffset;
        const fy = sunY + axisDy * flare.progress - scrollY * 0.15;

        const flareGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, flare.radius);
        flareGrad.addColorStop(0, `rgba(${flare.r}, ${flare.g}, ${flare.b}, ${flare.alpha * 1.5})`);
        flareGrad.addColorStop(
          0.6,
          `rgba(${flare.r}, ${flare.g}, ${flare.b}, ${flare.alpha * 0.5})`
        );
        flareGrad.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(fx, fy, flare.radius, 0, Math.PI * 2);
        ctx.fillStyle = flareGrad;
        ctx.fill();
      });

      // -------------------------------------------------------------
      // 5. SOLAR DUST PHOTONS (Motes drifting through the light)
      // -------------------------------------------------------------
      photons.forEach((p) => {
        // Natural gentle drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulsate opacity softly
        const pulse = Math.sin(tick * p.pulseSpeed + p.x);
        p.alpha = p.baseAlpha + pulse * 0.12;

        // Increased brightness when inside sunbeam zone
        const distToSun = Math.hypot(p.x - sunX, p.y - sunY);
        const sunbeamFactor = Math.max(0, 1 - distToSun / (sunMaxRadius * 0.9));
        const finalAlpha = Math.min(0.7, p.alpha + sunbeamFactor * 0.25);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        if (p.hue === 42) {
          ctx.fillStyle = `rgba(254, 240, 138, ${finalAlpha})`; // Warm golden photon
        } else {
          ctx.fillStyle = `rgba(110, 231, 183, ${finalAlpha * 0.8})`; // Energy emerald photon
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
