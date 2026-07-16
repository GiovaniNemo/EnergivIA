"use client";

import { Clock } from "lucide-react";
import type { ProcessStep, StepsTheme } from "./types";
import { StepIcon } from "./step-icon";
import { withAlpha } from "./steps-theme";

export interface HorizontalStepperLayoutProps {
  steps: ProcessStep[];
  theme: StepsTheme;
  getStepFieldPath?: (
    stepIndex: number,
    stepField: "icon" | "title" | "description" | "estimatedTime"
  ) => string | undefined;
}

export function HorizontalStepperLayout(props: HorizontalStepperLayoutProps): JSX.Element {
  const { steps, theme, getStepFieldPath } = props;
  const border = withAlpha(theme.primary, 0.22);
  const shadow = withAlpha(theme.primary, 0.12);
  const muted = withAlpha(theme.text, 0.7);
  const connector = withAlpha(theme.primary, 0.38);

  return (
    <div className="flex w-full flex-col gap-5 md:flex-row md:flex-wrap md:items-center">
      {steps.map((step, index) => {
        const pillShadow = "0 6px 24px " + shadow;
        return (
          <div key={step.title + String(index)} className="contents md:contents">
            <div
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-5 py-4 shadow-md ring-1 md:min-w-[200px] md:flex-none md:max-w-[280px]"
              style={{
                backgroundColor: withAlpha(theme.background, 0.65),
                borderColor: border,
                boxShadow: pillShadow,
                color: theme.text,
                borderWidth: 1,
                borderStyle: "solid",
              }}
            >
              <div
                data-editor-field-path={getStepFieldPath?.(index, "icon")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: withAlpha(theme.primary, 0.14) }}
              >
                <StepIcon index={index} iconName={step.icon} size={20} color={theme.primary} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  data-editor-field-path={getStepFieldPath?.(index, "title")}
                  className="text-sm font-semibold leading-tight"
                  style={{ color: theme.text }}
                >
                  {step.title}
                </p>
                {step.estimatedTime ? (
                  <p
                    data-editor-field-path={getStepFieldPath?.(index, "estimatedTime")}
                    className="mt-1 inline-flex items-center gap-1 text-xs"
                    style={{ color: muted }}
                  >
                    <Clock className="h-3 w-3 shrink-0" strokeWidth={2} />
                    <span>{step.estimatedTime}</span>
                  </p>
                ) : null}
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div
                className="hidden h-px flex-1 basis-4 md:block"
                style={{
                  minWidth: "16px",
                  backgroundColor: connector,
                }}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
