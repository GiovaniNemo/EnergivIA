"use client";

import { createProposalQrDataUrl } from "./cta-qr";
import { withAlpha } from "./cta-theme";
import type { DecisionCTATheme } from "./types";

export interface QRCodeBlockProps {
  url: string;
  theme: DecisionCTATheme;
}

const MIN_PX = 128;

export function QRCodeBlock(props: QRCodeBlockProps): JSX.Element | null {
  const { url, theme } = props;
  const dataUrl = createProposalQrDataUrl(url);
  if (!dataUrl) return null;

  const borderColor = withAlpha(theme.primary, 0.2);
  const boxShadow = "0 8px 28px " + withAlpha(theme.primary, 0.1);

  return (
    <div
      className="inline-flex flex-col items-center gap-2 rounded-2xl p-4"
      style={{
        backgroundColor: theme.background,
        border: "1px solid " + borderColor,
        boxShadow,
      }}
    >
      <img
        src={dataUrl}
        width={MIN_PX}
        height={MIN_PX}
        alt="QR Code para abrir a proposta"
        className="rounded-lg"
        style={{ minWidth: MIN_PX, minHeight: MIN_PX }}
      />
    </div>
  );
}
