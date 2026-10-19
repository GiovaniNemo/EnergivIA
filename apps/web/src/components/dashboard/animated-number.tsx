"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Curva de interpolação exponencial easeOut com desaceleração rápida e parada suave.
 * Garante que em 50% do tempo a maior parte do salto visual já foi percorrida.
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Interpola um valor numérico entre start e target de acordo com a curva easeOut.
 */
export function interpolateValue(start: number, target: number, progress: number): number {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const eased = easeOutExpo(clampedProgress);
  return start + (target - start) * eased;
}

/**
 * Formata um valor numérico para o padrão de exibição da plataforma:
 * - >= 1M: R$ 3,3M
 * - >= 10k: R$ 10k
 * - Menor: R$ 850
 * - <= 0: R$ 0
 */
export function formatBRLCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "R$ 0";
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 10_000) {
    return `R$ ${Math.round(value / 1_000).toLocaleString("pt-BR")}k`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00A0/g, " ");
}

/**
 * Formata um número inteiro no padrão pt-BR.
 */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("pt-BR");
}

/**
 * Formata um percentual inteiro (ex: 9%).
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

export interface UseCountUpOptions {
  duration?: number;
  initialValue?: number;
  enabled?: boolean;
  formatter?: (value: number) => string;
}

export function useCountUp(
  target: number,
  options: UseCountUpOptions = {}
): { value: number; displayValue: string; isAnimating: boolean } {
  const { duration = 1200, initialValue = 0, enabled = true, formatter } = options;

  const [current, setCurrent] = useState<number>(enabled ? initialValue : target);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !Number.isFinite(target)) {
      setCurrent(target);
      return;
    }

    const start = initialValue;
    const startTime = performance.now();
    setIsAnimating(true);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
      const interpolated = interpolateValue(start, target, progress);
      setCurrent(interpolated);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(target);
        setIsAnimating(false);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, initialValue, enabled]);

  const displayValue = formatter ? formatter(current) : formatInteger(current);

  return { value: current, displayValue, isAnimating };
}

export interface AnimatedNumberProps {
  value: number;
  initialValue?: number;
  duration?: number;
  formatter?: (val: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  enabled?: boolean;
}

export function AnimatedNumber({
  value,
  initialValue = 0,
  duration = 1200,
  formatter,
  prefix = "",
  suffix = "",
  className,
  enabled = true,
}: AnimatedNumberProps): JSX.Element {
  const { displayValue } = useCountUp(value, {
    duration,
    initialValue,
    formatter,
    enabled,
  });

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
