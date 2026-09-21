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
  pulseOffset: number;
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
      x: width * 0.85,
      y: height * 0.1,
      targetX: width * 0.85,
      targetY: height * 0.1,
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
    const photonCount = Math.min(55, Math.floor((width * height) / 22000));
    const photons: SolarPhoton[] = Array.from({ length: photonCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.65) * 0.35, // Natural drift towards bottom-left
      vy: Math.random() * 0.3 + 0.1,
      size: Math.random() * 2 + 0.6,
      alpha: Math.random() * 0.35 + 0.1,
      baseAlpha: Math.random() * 0.3 + 0.15,
      pulseSpeed: Math.random() * 0.025 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let tick = 0;

    // Organic volumetric sunbeams configuration (spread out realistically)
    const rays = [
      { baseAngle: 0.72, spread: 0.22, speed: 0.0005, intensity: 0.11 },
      { baseAngle: 0.88, spread: 0.34, speed: 0.0003, intensity: 0.14 },
      { baseAngle: 1.05, spread: 0.26, speed: 0.0006, intensity: 0.12 },
      { baseAngle: 1.22, spread: 0.38, speed: 0.0004, intensity: 0.15 },
      { baseAngle: 1.42, spread: 0.28, speed: 0.0007, intensity: 0.1 },
      { baseAngle: 1.62, spread: 0.32, speed: 0.0004, intensity: 0.08 },
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
      // 1. DYNAMIC SUN POSITION (Top-Right anchored with organic depth)
      // -------------------------------------------------------------
      // Sun center position in viewport coordinates
      const sunParallaxY = -35 + scrollY * 0.24;
      const sunMouseX = (mouse.x - width * 0.85) * 0.04;
      const sunX = width - 35 + sunMouseX;
      const sunY = sunParallaxY;

      const sunMaxRadius = Math.max(width * 0.9, 850);

      // -------------------------------------------------------------
      // 2. SOFT ATMOSPHERIC SUNSHINE WASH (Global Warm Light)
      // -------------------------------------------------------------
      const ambientLight = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunMaxRadius * 1.3);
      ambientLight.addColorStop(0, "rgba(255, 252, 235, 0.22)"); // Warm morning sunlight
      ambientLight.addColorStop(0.18, "rgba(254, 240, 138, 0.12)"); // Soft golden daylight
      ambientLight.addColorStop(0.4, "rgba(245, 158, 11, 0.05)"); // Amber atmosphere
      ambientLight.addColorStop(0.7, "rgba(16, 185, 129, 0.015)"); // Emerald undertone
      ambientLight.addColorStop(1, "transparent");

      ctx.fillStyle = ambientLight;
      ctx.fillRect(0, 0, width, height);

      // -------------------------------------------------------------
      // 3. REALISTIC VOLUMETRIC GOD RAYS (Additive Light Beams)
      // -------------------------------------------------------------
      // Using 'screen' blending for natural, photorealistic light scattering
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      rays.forEach((ray, i) => {
        const rayAngle =
          Math.PI * 0.72 +
          ray.baseAngle +
          Math.sin(tick * ray.speed + i * 1.5) * 0.05 -
          scrollY * 0.00035;

        const rayDist = sunMaxRadius * 1.35;
        const halfSpread = ray.spread * 0.5;

        const x1 = sunX + Math.cos(rayAngle - halfSpread) * rayDist;
        const y1 = sunY + Math.sin(rayAngle - halfSpread) * rayDist;
        const x2 = sunX + Math.cos(rayAngle + halfSpread) * rayDist;
        const y2 = sunY + Math.sin(rayAngle + halfSpread) * rayDist;

        const beamGrad = ctx.createRadialGradient(sunX, sunY, 40, sunX, sunY, rayDist);
        // Soft, desaturated, real optical sunlight falloff
        beamGrad.addColorStop(0, `rgba(255, 250, 220, ${ray.intensity * 1.4})`);
        beamGrad.addColorStop(0.25, `rgba(254, 243, 199, ${ray.intensity * 0.9})`);
        beamGrad.addColorStop(0.6, `rgba(251, 191, 36, ${ray.intensity * 0.35})`);
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
      // 4. ANAMORPHIC OPTICAL LENS STREAK (Cinematic Sun Glare)
      // -------------------------------------------------------------
      // Horizontal/diagonal flare streak passing through the sun disc
      const streakLength = Math.max(width * 0.55, 500);
      const streakAngle = Math.PI * 0.88; // Angled down-left along ray path

      const sx1 = sunX - Math.cos(streakAngle) * streakLength * 0.4;
      const sy1 = sunY - Math.sin(streakAngle) * streakLength * 0.4;
      const sx2 = sunX + Math.cos(streakAngle) * streakLength;
      const sy2 = sunY + Math.sin(streakAngle) * streakLength;

      const streakGrad = ctx.createLinearGradient(sx1, sy1, sx2, sy2);
      streakGrad.addColorStop(0, "transparent");
      streakGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.45)");
      streakGrad.addColorStop(0.32, "rgba(254, 243, 199, 0.65)");
      streakGrad.addColorStop(0.4, "rgba(251, 191, 36, 0.3)");
      streakGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.08)");
      streakGrad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.lineWidth = 14;
      ctx.strokeStyle = streakGrad;
      ctx.stroke();

      // Thin sharp core streak line
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.stroke();

      ctx.restore(); // Restore normal composite operation

      // -------------------------------------------------------------
      // 5. BRILLIANT SOLAR DISC & CORONA (Realistic Sun Core)
      // -------------------------------------------------------------
      // Multi-layered corona
      const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 320);
      corona.addColorStop(0, "rgba(255, 255, 255, 0.95)"); // Pure white-hot sun core
      corona.addColorStop(0.06, "rgba(255, 253, 230, 0.85)"); // White-gold inner corona
      corona.addColorStop(0.18, "rgba(254, 243, 199, 0.45)"); // Champagne solar glow
      corona.addColorStop(0.45, "rgba(252, 211, 77, 0.18)"); // Warm daylight amber
      corona.addColorStop(0.8, "rgba(245, 158, 11, 0.04)");
      corona.addColorStop(1, "transparent");

      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
      ctx.fill();

      // -------------------------------------------------------------
      // 6. DIFFRACTION SPIKES (Natural Optical Sun Flare Starburst)
      // -------------------------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const spikeLengths = [180, 140, 110, 160, 95, 130];
      const baseSpikeAngle = Math.PI * 0.75;

      spikeLengths.forEach((len, idx) => {
        const ang = baseSpikeAngle + (idx - 2.5) * 0.28 + Math.sin(tick * 0.01 + idx) * 0.02;
        const px = sunX + Math.cos(ang) * len;
        const py = sunY + Math.sin(ang) * len;

        const spikeGrad = ctx.createLinearGradient(sunX, sunY, px, py);
        spikeGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        spikeGrad.addColorStop(0.3, "rgba(254, 243, 199, 0.4)");
        spikeGrad.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(px, py);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = spikeGrad;
        ctx.stroke();
      });

      ctx.restore();

      // -------------------------------------------------------------
      // 7. LENS FLARE GHOST DISCS (Along Optical Axis to Center-Left)
      // -------------------------------------------------------------
      const targetPointX = width * 0.4;
      const targetPointY = height * 0.6;
      const axisDx = targetPointX - sunX;
      const axisDy = targetPointY - sunY;

      const flareGhosts = [
        { progress: 0.22, radius: 35, alpha: 0.09, r: 255, g: 250, b: 220 },
        { progress: 0.42, radius: 75, alpha: 0.06, r: 254, g: 240, b: 138 },
        { progress: 0.68, radius: 50, alpha: 0.04, r: 251, g: 191, b: 36 },
      ];

      flareGhosts.forEach((ghost) => {
        const gx = sunX + axisDx * ghost.progress;
        const gy = sunY + axisDy * ghost.progress - scrollY * 0.12;

        const ghostGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, ghost.radius);
        ghostGrad.addColorStop(0, `rgba(${ghost.r}, ${ghost.g}, ${ghost.b}, ${ghost.alpha * 1.6})`);
        ghostGrad.addColorStop(
          0.7,
          `rgba(${ghost.r}, ${ghost.g}, ${ghost.b}, ${ghost.alpha * 0.5})`
        );
        ghostGrad.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(gx, gy, ghost.radius, 0, Math.PI * 2);
        ctx.fillStyle = ghostGrad;
        ctx.fill();
      });

      // -------------------------------------------------------------
      // 8. SOLAR DUST PHOTONS (Motes Illuminating Through the Light)
      // -------------------------------------------------------------
      photons.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = Math.sin(tick * p.pulseSpeed + p.pulseOffset);
        p.alpha = p.baseAlpha + pulse * 0.12;

        // Photons brighten dynamically when inside the sunbeam cone
        const distToSun = Math.hypot(p.x - sunX, p.y - sunY);
        const sunbeamFactor = Math.max(0, 1 - distToSun / (sunMaxRadius * 0.95));
        const finalAlpha = Math.min(0.75, p.alpha + sunbeamFactor * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 243, 199, ${finalAlpha})`; // Warm sunlight photon
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
