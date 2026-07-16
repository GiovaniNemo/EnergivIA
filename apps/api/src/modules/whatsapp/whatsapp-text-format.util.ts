export function normalizeAssistantTextForWhatsapp(body: string): string {
  let s = body.replace(/\r\n/g, "\n");

  s = s.replace(/\\([*_~`#])/g, "$1");

  s = s
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .join("\n");

  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(/\*\*/g, "*");
  }

  return s.replace(/\n{3,}/g, "\n\n").trim();
}
