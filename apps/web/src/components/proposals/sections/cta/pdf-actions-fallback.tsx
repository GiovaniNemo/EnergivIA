"use client";

import type { DecisionCTAActions, DecisionCTATheme } from "./types";
import { QRCodeBlock } from "./qrcode-block";
import { withAlpha } from "./cta-theme";

export interface PDFActionsFallbackProps {
  proposalUrl: string;
  actions: DecisionCTAActions;
  theme: DecisionCTATheme;
  align: "left" | "center" | "right";
}

export function PDFActionsFallback({
  proposalUrl,
  actions,
  theme,
  align,
}: PDFActionsFallbackProps): JSX.Element {
  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const muted = withAlpha(theme.text, 0.75);
  const hasUrl = Boolean(proposalUrl.trim());

  const rows: string[] = [];
  if (actions.accept) rows.push("✓ Aceitar proposta");
  if (actions.edit) rows.push("✎ Solicitar alteração");
  if (actions.reject) rows.push("✕ Recusar proposta");

  return (
    <div className="space-y-5" style={{ textAlign }}>
      {rows.length > 0 ? (
        <ul
          className="m-0 list-none space-y-2 p-0 text-sm font-medium"
          style={{ color: theme.text }}
        >
          {rows.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {hasUrl ? (
        <>
          <div
            className={
              align === "center"
                ? "flex justify-center"
                : align === "right"
                  ? "flex justify-end"
                  : ""
            }
          >
            <QRCodeBlock url={proposalUrl} theme={theme} />
          </div>
          <p className="break-all text-xs font-medium" style={{ color: theme.primary }}>
            {proposalUrl}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: muted }}>
            Escaneie o QR Code ou acesse o link para continuar
          </p>
        </>
      ) : (
        <p className="text-sm" style={{ color: muted }}>
          Defina a URL base da proposta para exibir o QR Code e o link.
        </p>
      )}
    </div>
  );
}
