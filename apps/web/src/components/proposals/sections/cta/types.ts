import type { ReactNode } from "react";

export type DecisionCTAMode = "web" | "pdf";

export type DecisionCTAActions = {
  accept: boolean;
  edit: boolean;
  reject: boolean;
};

export type DecisionCTATheme = {
  primary: string;
  secondary: string;
  danger: string;
  text: string;
  background: string;
};

export type DecisionCTAEmphasis = "primary" | "secondary";

export type DecisionCTAAlign = "left" | "center" | "right";

export interface DecisionCTASectionProps {
  intro?: ReactNode;
  proposalUrl: string;
  actions: DecisionCTAActions;
  theme: DecisionCTATheme;
  mode: DecisionCTAMode;
  emphasis?: DecisionCTAEmphasis;
  align?: DecisionCTAAlign;
  className?: string;
}
