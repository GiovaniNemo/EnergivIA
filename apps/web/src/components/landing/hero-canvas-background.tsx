"use client";

import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
  depth: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

interface SolarPhoton {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
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
      initStars();
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

    // -------------------------------------------------------------
    // STARFIELD GENERATION (Céu Estrelado Realista)
    // -------------------------------------------------------------
    let stars: Star[] = [];
    const starColors = [
      "rgba(255, 255, 255, ", // Pure white star
      "rgba(224, 242, 254, ", // Soft diamond blue star
      "rgba(254, 243, 199, ", // Warm celestial gold star
      "rgba(240, 249, 255, ", // Crisp silver star
    ];

    const initStars = () => {
      const starCount = Math.min(180, Math.floor((width * height) / 9000));
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.6 + 0.25,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        depth: Math.random() * 0.7 + 0.3, // Depth for 3D parallax scroll
      }));
    };

    initStars();

    // Occasional subtle shooting stars (estrelas cadentes)
    const shootingStars: ShootingStar[] = [
      { x: 0, y: 0, length: 0, speed: 0, angle: 0, alpha: 0, active: false },
      { x: 0, y: 0, length: 0, speed: 0, angle: 0, alpha: 0, active: false },
    ];

    const spawnShootingStar = (star: ShootingStar) => {
      star.x = Math.random() * (width * 0.65);
      star.y = Math.random() * (height * 0.4);
      star.length = Math.random() * 80 + 50;
      star.speed = Math.random() * 8 + 7;
      star.angle = Math.PI * (0.2 + Math.random() * 0.1); // Diagonally downwards
      star.alpha = 1;
      star.active = true;
    };

    // Solar photons drifting across light rays
    const photonCount = Math.min(45, Math.floor((width * height) / 28000));
    const photons: SolarPhoton[] = Array.from({ length: photonCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.65) * 0.35,
      vy: Math.random() * 0.3 + 0.1,
      size: Math.random() * 1.8 + 0.7,
      alpha: Math.random() * 0.35 + 0.1,
      baseAlpha: Math.random() * 0.3 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));

    // God Rays configuration
    const rayConfigs = [
      { angleOffset: 0.28, width: 0.15, speed: 0.0006, intensity: 0.065 },
      { angleOffset: 0.48, width: 0.23, speed: 0.0004, intensity: 0.085 },
      { angleOffset: 0.72, width: 0.18, speed: 0.0007, intensity: 0.075 },
      { angleOffset: 0.95, width: 0.26, speed: 0.0005, intensity: 0.09 },
      { angleOffset: 1.22, width: 0.17, speed: 0.0008, intensity: 0.06 },
      { angleOffset: 1.45, width: 0.21, speed: 0.0004, intensity: 0.05 },
    ];

    let tick = 0;

    const render = () => {
      tick++;

      // Smooth scroll interpolation
      scrollY += (targetScrollY - scrollY) * 0.08;

      // Smooth mouse interaction
      mouse.x += (mouse.targetX - mouse.x) * 0.03;
      mouse.y += (mouse.targetY - mouse.y) * 0.03;

      ctx.clearRect(0, 0, width, height);

      // Sun position anchored at top-right
      const sunParallaxY = -40 + scrollY * 0.26;
      const sunMouseOffset = (mouse.x - width * 0.85) * 0.03;
      const sunX = width - 40 + sunMouseOffset;
      const sunY = sunParallaxY;
      const sunMaxRadius = Math.max(width * 0.85, 750);

      // -------------------------------------------------------------
      // 1. RENDER STARRY SKY (Céu Estrelado com Parallax e Cintilação)
      // -------------------------------------------------------------
      stars.forEach((s) => {
        // Vertical parallax scroll based on star's depth
        const drawY = (s.y - scrollY * s.depth * 0.35 + height * 5) % height;

        // Twinkling animation
        const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkleOffset);
        const starAlpha = s.baseAlpha * (0.65 + 0.35 * twinkle);

        // Natural wash-out near the sun (sunrise overpowers stars nearby)
        const distToSun = Math.hypot(s.x - sunX, drawY - sunY);
        const washOut = Math.min(1, Math.max(0.05, (distToSun - 180) / 450));
        const finalAlpha = starAlpha * washOut;

        if (finalAlpha > 0.03) {
          ctx.beginPath();
          ctx.arc(s.x, drawY, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `${s.color}${finalAlpha})`;
          ctx.fill();

          // Subtle star cross-sparkle for prominent stars
          if (s.size > 1.3 && finalAlpha > 0.45) {
            ctx.strokeStyle = `${s.color}${finalAlpha * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x - s.size * 2.2, drawY);
            ctx.lineTo(s.x + s.size * 2.2, drawY);
            ctx.moveTo(s.x, drawY - s.size * 2.2);
            ctx.lineTo(s.x, drawY + s.size * 2.2);
            ctx.stroke();
          }
        }
      });

      // -------------------------------------------------------------
      // 2. SHOOTING STARS (Estrelas Cadentes Ocasionais)
      // -------------------------------------------------------------
      if (tick % 240 === 0) {
        const inactive = shootingStars.find((st) => !st.active);
        if (inactive) spawnShootingStar(inactive);
      }

      shootingStars.forEach((st) => {
        if (!st.active) return;
        st.x += Math.cos(st.angle) * st.speed;
        st.y += Math.sin(st.angle) * st.speed;
        st.alpha -= 0.015;

        if (st.alpha <= 0 || st.x > width || st.y > height) {
          st.active = false;
          return;
        }

        const tailX = st.x - Math.cos(st.angle) * st.length;
        const tailY = st.y - Math.sin(st.angle) * st.length;

        const meteorGrad = ctx.createLinearGradient(tailX, tailY, st.x, st.y);
        meteorGrad.addColorStop(0, "transparent");
        meteorGrad.addColorStop(0.7, `rgba(224, 242, 254, ${st.alpha * 0.4})`);
        meteorGrad.addColorStop(1, `rgba(255, 255, 255, ${st.alpha * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(st.x, st.y);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = meteorGrad;
        ctx.stroke();
      });

      // -------------------------------------------------------------
      // 3. WARM SOLAR GOD RAYS (Mantendo os feixes de sol do topo)
      // -------------------------------------------------------------
      const rayOriginAngle = Math.PI * 0.75; // Diagonally down-left towards content

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

        const beamGrad = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, rayReach);
        beamGrad.addColorStop(0, `rgba(254, 243, 199, ${ray.intensity * 1.2})`);
        beamGrad.addColorStop(0.3, `rgba(251, 191, 36, ${ray.intensity * 0.7})`);
        beamGrad.addColorStop(0.7, `rgba(245, 158, 11, ${ray.intensity * 0.2})`);
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
      // 4. SOLAR RADIANCE CORE (Mantendo a corona solar suave)
      // -------------------------------------------------------------
      const coreGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunMaxRadius);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)"); // Core incandescente
      coreGrad.addColorStop(0.04, "rgba(254, 243, 199, 0.48)"); // Corona quente
      coreGrad.addColorStop(0.12, "rgba(252, 211, 77, 0.2)"); // Luz solar dourada
      coreGrad.addColorStop(0.28, "rgba(245, 158, 11, 0.08)"); // Âmbar atmosférico
      coreGrad.addColorStop(0.55, "rgba(16, 185, 129, 0.02)");
      coreGrad.addColorStop(1, "transparent");

      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // -------------------------------------------------------------
      // 5. OPTICAL LENS FLARE DISCS (Discos de luz ao longo do eixo)
      // -------------------------------------------------------------
      const targetPointX = width * 0.35;
      const targetPointY = height * 0.65;
      const axisDx = targetPointX - sunX;
      const axisDy = targetPointY - sunY;

      const flares = [
        { progress: 0.25, radius: 45, alpha: 0.08, r: 254, g: 240, b: 138 },
        { progress: 0.45, radius: 95, alpha: 0.05, r: 251, g: 191, b: 36 },
        { progress: 0.72, radius: 60, alpha: 0.04, r: 16, g: 185, b: 129 },
      ];

      flares.forEach((flare) => {
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
      // 6. SOLAR DUST PHOTONS (Poeira estelar e solar flutuante)
      // -------------------------------------------------------------
      photons.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = Math.sin(tick * p.pulseSpeed + p.x);
        p.alpha = p.baseAlpha + pulse * 0.12;

        const distToSun = Math.hypot(p.x - sunX, p.y - sunY);
        const sunbeamFactor = Math.max(0, 1 - distToSun / (sunMaxRadius * 0.9));
        const finalAlpha = Math.min(0.7, p.alpha + sunbeamFactor * 0.25);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 240, 138, ${finalAlpha})`;
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
