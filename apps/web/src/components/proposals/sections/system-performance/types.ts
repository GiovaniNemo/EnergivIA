import type { ReactNode } from "react";

export interface SystemPerformanceTheme {
  primary: string;
  secondary: string;
  text: string;
  background: string;
}

export type SystemPerformanceVisualVariant = "default" | "modern" | "modern_dashboard";

export interface SystemPerformanceSectionProps {
  potencia: number;
  geracaoMensal: number;
  cobertura: number;
  equivalenteAmbiental: number;
  consumoMensal: number[];
  producaoMensal: number[];
  meses: string[];
  theme: SystemPerformanceTheme;
  intro?: ReactNode;
  variant?: SystemPerformanceVisualVariant;
}
