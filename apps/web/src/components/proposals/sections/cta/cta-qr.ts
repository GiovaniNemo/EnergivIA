import qrcodeFactory from "qrcode-generator";

export function createProposalQrDataUrl(contents: string): string | null {
  const trimmed = contents.trim();
  if (!trimmed) return null;
  try {
    const qr = qrcodeFactory(0, "M");
    qr.addData(trimmed);
    qr.make();
    return qr.createDataURL(4, 2);
  } catch {
    return null;
  }
}
