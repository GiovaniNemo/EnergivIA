import type { ProposalSection, SectionType } from "./types";

export interface PdfPageDefinition {
  pageNumber: number; // 2..N (Page 1 is Cover)
  sections: ProposalSection[];
}

const DENSE_FULL_PAGE_SECTION_TYPES: ReadonlySet<SectionType> = new Set([
  "generation_consumption",
  "gallery",
]);

const MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE = 6;

/**
 * Retorna o peso visual estimado de uma seção para diagramação em folha A4 (0 a 1.0).
 * Uma folha A4 tem orçamento total de peso = 1.0 (permite até 2 seções compactas por página).
 * Evita deixar seções curtas (ex: uma única foto com título) isoladas em folhas vazias.
 */
export function getSectionPdfWeight(section: ProposalSection): number {
  if (DENSE_FULL_PAGE_SECTION_TYPES.has(section.type)) {
    return 1.0;
  }

  const fields = section.fields as Record<string, unknown> | undefined;

  // Equipamentos: se tiver mais de 3 itens, precisa de página dedicada; se for compacto (1-3 itens), peso 0.5
  if (section.type === "proposal_equipment") {
    const rawItems = fields?.["equipmentItems"];
    if (Array.isArray(rawItems) && rawItems.length > 3) {
      return 1.0;
    }
    return 0.5;
  }

  // Sobre a empresa: peso 0.5 para compartilhar harmoniosamente a Página 2 com a Introdução (0.5 + 0.5 = 1.0)
  if (section.type === "about_company") {
    return 0.5;
  }

  // Seções com texto muito longo ganham página dedicada para não espremer
  if (fields) {
    const textContent = typeof fields["text"] === "string" ? fields["text"] : "";
    if (textContent.length >= 600) {
      return 1.0;
    }
    if (Array.isArray(fields["items"]) && fields["items"].length > 5) {
      return 1.0;
    }
    if (Array.isArray(fields["steps"]) && fields["steps"].length > 5) {
      return 1.0;
    }
  }

  // Seções regulares (diagnostic_energy, solution, about_company, guarantees, signature, etc.)
  return 0.5;
}

/**
 * Normaliza e pré-processa seções antes da paginação.
 * Se uma lista de equipamentos for muito extensa (> 6 itens), particiona
 * suavemente a seção em páginas consecutivas para garantir que nenhum card
 * seja partido ao meio ou decepado no corte da folha A4.
 */
function prepareSectionsForPdfPagination(sections: ProposalSection[]): ProposalSection[] {
  const prepared: ProposalSection[] = [];

  for (const section of sections) {
    if (section.type === "proposal_equipment") {
      const fields = (section.fields ?? {}) as Record<string, unknown>;
      const rawItems = fields["equipmentItems"];

      if (Array.isArray(rawItems) && rawItems.length > MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE) {
        // Particiona em blocos de até MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE itens
        for (let i = 0; i < rawItems.length; i += MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE) {
          const chunk = rawItems.slice(i, i + MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE);
          const partIndex = Math.floor(i / MAX_EQUIPMENT_ITEMS_PER_PDF_PAGE) + 1;
          const isContinuation = partIndex > 1;

          prepared.push({
            ...section,
            id: isContinuation ? `${section.id}_part_${partIndex}` : section.id,
            title: isContinuation
              ? `${section.title || "Equipamentos"} (Continuação)`
              : section.title,
            fields: {
              ...fields,
              equipmentItems: chunk,
              title: isContinuation
                ? `${String(fields["title"] || "Equipamentos")} (Continuação)`
                : fields["title"],
            },
          });
        }
        continue;
      }
    }

    prepared.push(section);
  }

  return prepared;
}

/**
 * Distribui as seções visíveis em folhas A4 discretas de forma inteligente.
 * Garante que:
 * 1. Nenhuma página exceda o orçamento visual de 1.0 (máximo 2 seções compactas por página).
 * 2. Seções complexas (sobre nós com foto/stats, gráfico de geração, tabela de equipamentos, pricing)
 *    ganhem uma página executiva dedicada inteira.
 * 3. Listas longas de equipamentos sejam particionadas em páginas contínuas sem cortes de cards.
 * 4. Seções correlatas compactas (ex: diagnóstico + solução curta) fiquem juntas
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
  const normalizedSections = prepareSectionsForPdfPagination(visibleSections);

  let currentPageSections: ProposalSection[] = [];
  let currentWeight = 0;

  for (const section of normalizedSections) {
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
