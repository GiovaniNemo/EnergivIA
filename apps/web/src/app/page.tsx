import type { Metadata } from "next";
import { LandingHomeClient } from "@/components/landing-v2/landing-home-client";

export const metadata: Metadata = {
  title: "EnergivIA | Software e IA para Integradores de Energia Solar",
  description:
    "Gere propostas comerciais solares completas em segundos, simule economia com inteligência artificial e aumente as conversões da sua empresa de energia solar.",
  openGraph: {
    title: "EnergivIA | Software e IA para Integradores de Energia Solar",
    description:
      "Gere propostas comerciais solares completas em segundos, simule economia com inteligência artificial e aumente suas conversões.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function HomePage(): JSX.Element {
  return <LandingHomeClient />;
}
