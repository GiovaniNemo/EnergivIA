"use client";

import { Clock } from "lucide-react";
import type { ProcessStep, StepsTheme } from "./types";
import { StepIcon } from "./step-icon";
import { withAlpha } from "./steps-theme";

export interface StepsGridLayoutProps {
  steps: ProcessStep[];
  theme: StepsTheme;
  getStepFieldPath?: (
    stepIndex: number,
    stepField: "icon" | "title" | "description" | "estimatedTime"
  ) => string | undefined;
}

export function StepsGridLayout({
  steps,
  theme,
  getStepFieldPath,
}: StepsGridLayoutProps): JSX.Element {
  const border = withAlpha(theme.primary, 0.2);
  const shadow = withAlpha(theme.primary, 0.1);
  const muted = withAlpha(theme.text, 0.72);
  const timeBg = withAlpha(theme.secondary, 0.18);
  const timeFg = theme.secondary;

  return (
    <div className="steps-cards-grid grid grid-cols-1 gap-6">
      {steps.map((step, index) => (
        <article
          key={`${step.title}-${index}`}
          className="flex flex-col rounded-2xl p-6 shadow-lg ring-1"
          style={{
            borderRadius: 18,
            padding: "20px 22px",
            backgroundColor: withAlpha(theme.background, 0.55),
            borderColor: border,
            borderWidth: 1,
            borderStyle: "solid",
            boxShadow: `0 10px 36px ${shadow}`,
            color: theme.text,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              data-editor-field-path={getStepFieldPath?.(index, "icon")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: withAlpha(theme.primary, 0.14) }}
            >
              <StepIcon index={index} iconName={step.icon} size={24} color={theme.primary} />
            </div>
            <div className="min-w-0 flex-1">
              <h4
                data-editor-field-path={getStepFieldPath?.(index, "title")}
                className="text-base font-semibold leading-snug"
                style={{ color: theme.text }}
              >
                {step.title}
              </h4>
              {step.estimatedTime ? (
                <p
                  data-editor-field-path={getStepFieldPath?.(index, "estimatedTime")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: timeBg, color: timeFg }}
                >
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>{step.estimatedTime}</span>
                </p>
              ) : null}
            </div>
          </div>
          {step.description ? (
            <p
              data-editor-field-path={getStepFieldPath?.(index, "description")}
              className="mt-4 text-sm leading-relaxed"
              style={{ color: muted }}
            >
              {step.description}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
