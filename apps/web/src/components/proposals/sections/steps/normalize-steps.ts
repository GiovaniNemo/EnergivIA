import type { ProcessStep } from "./types";

export function normalizeProcessSteps(raw: unknown): ProcessStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    if (typeof item === "string") {
      const t = item.trim();
      return {
        title: t || `Etapa ${index + 1}`,
        description: "",
        estimatedTime: "",
      };
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const title = String(o["title"] ?? o["text"] ?? o["name"] ?? "").trim();
      return {
        title: title || `Etapa ${index + 1}`,
        description: String(o["description"] ?? "").trim(),
        estimatedTime: String(o["estimatedTime"] ?? o["duration"] ?? o["time"] ?? "").trim(),
        icon: String(o["icon"] ?? "").trim() || undefined,
      };
    }
    return { title: `Etapa ${index + 1}`, description: "", estimatedTime: "" };
  });
}

export function demoProcessSteps(): ProcessStep[] {
  return [
    {
      title: "Visita técnica",
      description: "Análise de telhado, consumo e viabilidade de conexão.",
      estimatedTime: "3–5 dias",
      icon: "search",
    },
    {
      title: "Projeto e documentação",
      description: "Dimensionamento e protocolo junto à concessionária.",
      estimatedTime: "2–4 semanas",
      icon: "clipboard-list",
    },
    {
      title: "Instalação",
      description: "Montagem dos módulos, inversor e testes.",
      estimatedTime: "2–3 dias",
      icon: "hammer",
    },
    {
      title: "Ativação",
      description: "Vistoria, religação e acompanhamento inicial.",
      estimatedTime: "1–2 semanas",
      icon: "check-circle",
    },
  ];
}
