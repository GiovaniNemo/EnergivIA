/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Estados da Máquina de Estados Finita (FSM) do Bot de WhatsApp
 */
export type WhatsappBotStep =
  | "IDLE" // Menu inicial / Aguardando fatura, consumo em kWh ou potência em kWp
  | "AWAITING_CITY" // Aguardando município e estado (ex: "Maringá/PR")
  | "AWAITING_CITY_STATE" // Aguardando seleção de estado para município homônimo (ex: Belém -> PA, AL, PB)
  | "AWAITING_GRID_TYPE" // Aguardando padrão da rede elétrica (Mono, Bi, Tri)
  | "AWAITING_BATTERY_STORAGE" // Aguardando capacidade/quantidade de baterias para sistema híbrido
  | "AWAITING_ROOF_TYPE" // Aguardando estrutura do telhado (Cerâmica, Fibro, etc.)
  | "AWAITING_KIT_SELECTION" // Aguardando escolha do kit (1-Standard, 2-Elite, 3-Premium)
  | "AWAITING_PRICE_CONFIRMATION" // Confirmar preço padrão ou digitar outro
  | "AWAITING_CUSTOM_PRICE" // Digitação manual de R$/kWp ou valor total
  | "AWAITING_CLIENT_NAME" // Nome do cliente final
  | "AWAITING_CLIENT_PHONE" // WhatsApp com DDD do cliente final (ou "0" para pular)
  | "AWAITING_TEMPLATE_SELECTION" // Escolha do modelo comercial da proposta
  | "PROPOSAL_COMPLETED"; // Proposta gerada; aceita comando "PDF" ou "novo"

/**
 * Dados estruturados acumulados durante a sessão de simulação
 */
export interface WhatsappSessionData {
  cidade?: string;
  uf?: string;
  hsp?: number;
  consumptionKwh?: number;
  kwp?: number;
  moduleCount?: number;
  gridType?: string;
  roofType?: string;
  inverterType?: "string" | "microinverter" | "hybrid" | "off_grid";
  batteryKwh?: number;
  batteryQty?: number;
  batteryVoltageType?: "LV" | "HV";
  hasBms?: boolean;
  quotesList?: Array<{
    distributorName: string;
    kwp: number;
    estimatedGeneration: number;
    items: string[];
    priceBrl?: number;
    inverterModel?: string;
    moduleModel?: string;
    inverterQty?: number;
  }>;
  selectedQuoteIndex?: number;
  selectedTierName?: string;
  kwpRate?: number;
  quotedSaleBrl?: number;
  clientName?: string;
  clientPhone?: string;
  selectedTemplateId?: string;
  lastProposalId?: string;
  lastProposalNumber?: string | number;
  pendingCityCandidates?: Array<{
    city: string;
    uf: string;
    hsp: number;
    stateName?: string;
    isCapital?: boolean;
  }>;
  pendingCityName?: string;
  [key: string]: any;
}

/**
 * Mapeamento determinístico de retrocesso para o comando "0" ou "voltar"
 */
export const STEP_PREVIOUS_MAP: Partial<Record<WhatsappBotStep, WhatsappBotStep>> = {
  AWAITING_TEMPLATE_SELECTION: "AWAITING_CLIENT_PHONE",
  AWAITING_CLIENT_PHONE: "AWAITING_CLIENT_NAME",
  AWAITING_CLIENT_NAME: "AWAITING_PRICE_CONFIRMATION",
  AWAITING_CUSTOM_PRICE: "AWAITING_PRICE_CONFIRMATION",
  AWAITING_PRICE_CONFIRMATION: "AWAITING_KIT_SELECTION",
  AWAITING_KIT_SELECTION: "AWAITING_ROOF_TYPE",
  AWAITING_ROOF_TYPE: "AWAITING_GRID_TYPE",
  AWAITING_BATTERY_STORAGE: "AWAITING_GRID_TYPE",
  AWAITING_GRID_TYPE: "AWAITING_CITY",
  AWAITING_CITY_STATE: "AWAITING_CITY",
};

/**
 * Verifica se a mensagem do usuário é um comando para reiniciar a conversa
 */
export function isResetCommand(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[.,!?:;*~_]/g, "");
  return (
    clean === "novo" ||
    clean === "reiniciar" ||
    clean === "nova cotação" ||
    clean === "nova cotacao" ||
    clean === "recomeçar" ||
    clean === "recomecar" ||
    clean === "início" ||
    clean === "inicio" ||
    clean === "menu"
  );
}

/**
 * Verifica se a mensagem do usuário é um comando para voltar ao passo anterior
 */
export function isBackCommand(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[.,!?:;*~_]/g, "");
  return clean === "0" || clean === "0️⃣" || clean === "voltar" || clean === "retornar";
}
