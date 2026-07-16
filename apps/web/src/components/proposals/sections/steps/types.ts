import type { ReactNode } from "react";

export type StepsLayout = "vertical" | "horizontal" | "cards";

export interface ProcessStep {
  title: string;
  description: string;
  estimatedTime: string;
  icon?: string;
}

export interface StepsTheme {
  text: string;
  background: string;
  primary: string;
  secondary: string;
}

export interface StepsSectionProps {
  steps: ProcessStep[];
  layout: StepsLayout;
  theme: StepsTheme;
  align?: "left" | "center" | "right";
  getStepFieldPath?: (
    stepIndex: number,
    stepField: "icon" | "title" | "description" | "estimatedTime"
  ) => string | undefined;
  intro?: ReactNode;
  className?: string;
}
