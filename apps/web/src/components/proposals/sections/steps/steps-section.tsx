"use client";

import type { StepsSectionProps } from "./types";
import { VerticalTimelineLayout } from "./vertical-timeline-layout";
import { HorizontalStepperLayout } from "./horizontal-stepper-layout";
import { StepsGridLayout } from "./steps-grid-layout";

export function StepsSection({
  steps,
  layout,
  theme,
  align = "left",
  getStepFieldPath,
  intro,
  className,
}: StepsSectionProps): JSX.Element {
  const list = steps.length ? steps : [];

  const body =
    layout === "horizontal" ? (
      <HorizontalStepperLayout steps={list} theme={theme} getStepFieldPath={getStepFieldPath} />
    ) : layout === "cards" ? (
      <StepsGridLayout steps={list} theme={theme} getStepFieldPath={getStepFieldPath} />
    ) : (
      <VerticalTimelineLayout
        steps={list}
        theme={theme}
        align={align}
        getStepFieldPath={getStepFieldPath}
      />
    );

  return (
    <div
      className={["w-full min-w-0", className].filter(Boolean).join(" ")}
      style={{ color: theme.text }}
    >
      {intro ? <div className="mb-6 max-w-none">{intro}</div> : null}
      {body}
    </div>
  );
}

export type { StepsLayout, StepsSectionProps, ProcessStep, StepsTheme } from "./types";
