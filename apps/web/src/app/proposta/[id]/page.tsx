import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProposalView } from "@/components/proposals/public-proposal-view";
import { LoadingState } from "@/components/ui/loading-state";
import { getPublicProposal } from "@/lib/public-proposals-api";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const fallbackTitle = "Proposta Comercial Solar | EnergivIA";
  try {
    const proposal = await getPublicProposal(params.id);
    if (!proposal) {
      return { title: fallbackTitle };
    }

    const companyName = proposal.companyName || "EnergivIA Solar";
    const clientName = proposal.deal?.lead?.name || "Cliente";
    const kwp =
      proposal.renderedData?.integrator?.systemPowerKw ||
      (proposal.simulation?.result as { recommendedPowerKw?: number } | undefined)
        ?.recommendedPowerKw;

    const title = `Proposta Comercial Solar | ${companyName}`;
    const description = kwp
      ? `Proposta personalizada de ${kwp} kWp para ${clientName}. Gerada por ${companyName}. Acesse para conferir todos os detalhes.`
      : `Proposta comercial personalizada para ${clientName}. Gerada por ${companyName}. Acesse para conferir todos os detalhes.`;

    const rawLogo = proposal.companyLogoUrl;
    let imageUrl = "/og-image.png";
    if (rawLogo && typeof rawLogo === "string" && rawLogo.trim()) {
      const trimmed = rawLogo.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        imageUrl = trimmed;
      } else {
        const baseUrl = (
          process.env["NEXT_PUBLIC_APP_URL"] || "https://www.energivia.com.br"
        ).replace(/\/$/, "");
        imageUrl = `${baseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      }
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            alt: `Logo ${companyName}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: fallbackTitle,
    };
  }
}

export default function PublicProposalPage({ params }: { params: { id: string } }): JSX.Element {
  return (
    <Suspense fallback={<LoadingState label="Carregando proposta" compact />}>
      <PublicProposalView proposalId={params.id} />
    </Suspense>
  );
}
