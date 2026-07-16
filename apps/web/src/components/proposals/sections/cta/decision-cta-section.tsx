"use client";

import { CTAHeader } from "./cta-header";
import { CTAButtons } from "./cta-buttons";
import { PDFActionsFallback } from "./pdf-actions-fallback";
import type { DecisionCTASectionProps } from "./types";
import { withAlpha } from "./cta-theme";

export function DecisionCTASection(props: DecisionCTASectionProps): JSX.Element {
  const {
    intro,
    proposalUrl,
    actions,
    theme,
    mode,
    emphasis = "primary",
    align = "center",
    className,
  } = props;

  const muted = withAlpha(theme.text, 0.72);
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  const inner = (
    <>
      <CTAHeader subtitle={intro} mutedColor={muted} align={align} />
      {mode === "web" ? (
        <CTAButtons proposalUrl={proposalUrl} actions={actions} theme={theme} align={align} />
      ) : (
        <PDFActionsFallback
          proposalUrl={proposalUrl}
          actions={actions}
          theme={theme}
          align={align}
        />
      )}
    </>
  );

  if (emphasis === "secondary") {
    return (
      <div className={className} style={{ color: theme.text }}>
        <div className={alignClass}>{inner}</div>
      </div>
    );
  }

  const border = withAlpha(theme.primary, 0.2);
  const cardShadow = "0 16px 48px " + withAlpha(theme.primary, 0.1);
  const cardBg = withAlpha(theme.background, 0.45);

  return (
    <div className={className} style={{ color: theme.text }}>
      <div
        className={"rounded-2xl border px-6 py-8 sm:px-8 " + alignClass}
        style={{
          borderColor: border,
          backgroundColor: cardBg,
          boxShadow: cardShadow,
          paddingTop: 28,
          paddingBottom: 28,
        }}
      >
        {inner}
      </div>
    </div>
  );
}

export type {
  DecisionCTASectionProps,
  DecisionCTAMode,
  DecisionCTAActions,
  DecisionCTATheme,
} from "./types";
