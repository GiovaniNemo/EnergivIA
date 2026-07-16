"use client";

import { Clock } from "lucide-react";
import type { ProcessStep, StepsTheme } from "./types";
import { StepIcon } from "./step-icon";
import { withAlpha } from "./steps-theme";

export interface VerticalTimelineLayoutProps {
  steps: ProcessStep[];
  theme: StepsTheme;
  align?: "left" | "center" | "right";
  getStepFieldPath?: (
    stepIndex: number,
    stepField: "icon" | "title" | "description" | "estimatedTime"
  ) => string | undefined;
}

export function VerticalTimelineLayout({
  steps,
  theme,
  align = "left",
  getStepFieldPath,
}: VerticalTimelineLayoutProps): JSX.Element {
  const line = withAlpha(theme.primary, 0.35);
  const circleBorder = withAlpha(theme.primary, 0.45);
  const circleBg = theme.background;
  const muted = withAlpha(theme.text, 0.72);
  const isCenter = align === "center";
  const isRight = align === "right";
  const rootClass = isCenter
    ? "relative flex w-full min-w-0 self-stretch justify-center px-2"
    : isRight
      ? "relative flex w-full min-w-0 self-stretch justify-end px-2"
      : "relative pl-2";
  const contentClass = isCenter
    ? "min-w-0 flex-1 pt-0.5 text-left"
    : isRight
      ? "min-w-0 flex-1 pt-0.5 text-right"
      : "min-w-0 flex-1 pt-0.5";

  return (
    <div className={rootClass}>
      <ul
        className={`relative m-0 list-none space-y-0 p-0 ${
          isCenter
            ? "w-full max-w-[min(100%,440px)]"
            : isRight
              ? "ml-auto w-full max-w-[min(100%,440px)]"
              : ""
        }`}
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={`${step.title}-${index}`}
              className={`relative flex gap-5 pb-8 last:pb-0 ${isRight ? "flex-row-reverse" : ""}`}
            >
              {!isLast ? (
                <span
                  className={`absolute top-[44px] w-px ${isRight ? "right-[22px]" : "left-[22px]"}`}
                  style={{
                    height: "calc(100% - 12px)",
                    backgroundColor: line,
                  }}
                  aria-hidden
                />
              ) : null}
              <div
                data-editor-field-path={getStepFieldPath?.(index, "icon")}
                className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ring-2"
                style={{
                  backgroundColor: circleBg,
                  borderColor: circleBorder,
                  boxShadow: `0 4px 14px ${withAlpha(theme.primary, 0.15)}`,
                  color: theme.primary,
                }}
              >
                <StepIcon index={index} iconName={step.icon} size={20} color={theme.primary} />
              </div>
              <div className={contentClass}>
                <p
                  data-editor-field-path={getStepFieldPath?.(index, "title")}
                  className="text-base font-semibold leading-snug"
                  style={{ color: theme.text }}
                >
                  {step.title}
                </p>
                {step.description ? (
                  <p
                    data-editor-field-path={getStepFieldPath?.(index, "description")}
                    className="mt-1.5 text-sm leading-relaxed"
                    style={{ color: muted }}
                  >
                    {step.description}
                  </p>
                ) : null}
                {step.estimatedTime ? (
                  <p
                    data-editor-field-path={getStepFieldPath?.(index, "estimatedTime")}
                    className={`mt-2 items-center gap-1.5 text-xs font-medium ${
                      isRight ? "flex w-full justify-end" : "inline-flex"
                    }`}
                    style={{ color: muted }}
                  >
                    <Clock
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                      style={{ color: muted }}
                    />
                    <span>{step.estimatedTime}</span>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
