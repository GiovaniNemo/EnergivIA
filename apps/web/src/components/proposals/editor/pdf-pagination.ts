import type { ProposalSection, SectionType } from "./types";

export interface PdfPageDefinition {
  pageNumber: number; // 2..N (Page 1 is Cover)
  sections: ProposalSection[];
}

const FULL_PAGE_SECTION_TYPES: ReadonlySet<SectionType> = new Set([
  "about_company",
  "generation_consumption",
  "proposal_equipment",
  "pricing",
  "gallery",
  "signature",
]);

/**
 * Retorna o peso visual estimado de uma seção para diagramação em folha A4 (0 a 1.0).
 * Uma folha A4 tem orçamento total de peso = 1.0.
 */
export function getSectionPdfWeight(section: ProposalSection): number {
  if (FULL_PAGE_SECTION_TYPES.has(section.type)) {
    return 1.0;
  }
  // Seções compactas (diagnóstico, solução, garantias, passos, etc.)
  return 0.5;
}

/**
 * Distribui as seções visíveis em folhas A4 discretas de forma inteligente.
 * Garante que:
 * 1. Nenhuma página exceda o orçamento visual de 1.0 (máximo 2 seções compactas por página).
 * 2. Seções complexas (sobre nós com foto/stats, gráfico de geração, tabela de equipamentos, pricing)
 *    ganhem uma página executiva dedicada inteira.
 * 3. Seções correlatas compactas (ex: diagnóstico + solução, garantias + passos) fiquem juntas
 *    sem deixar grandes vazios ou quebras artificiais.
 *
 * @param visibleSections Seções ativas no documento (excluindo capa e seções interativas como cta/video)
 * @param startPageNumber Número da primeira página de conteúdo (padrão: 2, pois a Capa é a Página 1)
 */
export function distributeSectionsIntoPdfPages(
  visibleSections: ProposalSection[],
  startPageNumber: number = 2
): PdfPageDefinition[] {
  const pages: PdfPageDefinition[] = [];
  let currentPageSections: ProposalSection[] = [];
  let currentWeight = 0;

  for (const section of visibleSections) {
    const weight = getSectionPdfWeight(section);

    // Se adicionar esta seção ultrapassar a capacidade da folha A4, ou se a folha já tiver 2 seções
    if (
      currentPageSections.length > 0 &&
      (currentWeight + weight > 1.0 || currentPageSections.length >= 2)
    ) {
      pages.push({
        pageNumber: startPageNumber + pages.length,
        sections: currentPageSections,
      });
      currentPageSections = [section];
      currentWeight = weight;
    } else {
      currentPageSections.push(section);
      currentWeight += weight;

      // Se a página já está cheia (peso 1.0), fecha a página
      if (currentWeight >= 1.0 || currentPageSections.length >= 2) {
        pages.push({
          pageNumber: startPageNumber + pages.length,
          sections: currentPageSections,
        });
        currentPageSections = [];
        currentWeight = 0;
      }
    }
  }

  // Se sobrou alguma seção pendente na última página
  if (currentPageSections.length > 0) {
    pages.push({
      pageNumber: startPageNumber + pages.length,
      sections: currentPageSections,
    });
  }

  return pages;
}
