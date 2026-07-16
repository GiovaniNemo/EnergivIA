import { createBaseDocument } from "@/components/proposals/editor/utils";

export function createScratchProposalDocument() {
  return createBaseDocument("Novo template", [
    "Capa",
    "Introdução",
    "Sobre a Empresa",
    "Solução proposta",
    "Investimento",
    "Depoimentos",
    "Assinatura",
  ]);
}
