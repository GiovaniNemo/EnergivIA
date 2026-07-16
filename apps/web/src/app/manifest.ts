import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnergivIA",
    short_name: "EnergivIA",
    description:
      "Plataforma para integradores solares gerarem propostas, simulações e operação comercial com IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f8f8",
    theme_color: "#19c8b5",
    lang: "pt-BR",
    icons: [
      {
        src: "/favicon-light.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon-dark.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
