export interface PreviewRenderVariables {
  nome_cliente: string;
  nome_empresa: string;
  data_proposta: string;
  tamanho_sistema_kw: string;
  modulos_sistema: string;
  inversor_sistema: string;
  producao_anual: string;
  investimento_total: string;
  investimento_desconto: string;
  economia_mensal: string;
  economia_anual: string;
  payback_anos: string;
  financiamento_parcela: string;
  financiamento_meses: string;
  financiamento_entrada: string;
  comparacao_antes: string;
  comparacao_depois: string;
  conta_mensal_energia?: number;
  gasto_anual_energia?: number;
  custo_5_anos_energia?: number;
  custo_10_anos_energia?: number;
  conta_mensal_energia_br?: string;
  gasto_anual_energia_br?: string;
  custo_5_anos_energia_br?: string;
  custo_10_anos_energia_br?: string;
  taxa_reajuste_anual?: string;
  potencia_sistema_kwp?: string | number;
  geracao_mensal_kwh?: string | number;
  cobertura_consumo_pct?: string | number;
  equivalente_arvores_ano?: string | number;
}

export type SectionRenderMode = "web" | "pdf";

export interface SectionRenderOptions {
  mode?: SectionRenderMode;
  productCatalogById?: Record<string, unknown>;
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
  };
  generationConsumptionChart?: {
    consumoMensal: number[];
    producaoMensal: number[];
  } | null;
}
