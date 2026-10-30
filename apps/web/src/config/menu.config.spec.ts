import { describe, expect, it } from "vitest";
import { MENU_ITEMS } from "./menu.config";

describe("menu.config hierarchy and ordering", () => {
  it("should have the correct items and order in management section", () => {
    const managementItems = MENU_ITEMS.filter((item) => item.section === "management");
    const labels = managementItems.map((item) => item.label);
    const paths = managementItems.map((item) => item.path);

    expect(labels).toEqual([
      "Organização",
      "Equipe",
      "Perfil do Integrador",
      "Templates de Proposta",
      "Modelos de Contratos",
      "Meus Planos",
      "Configurações",
      "Central de Ajuda",
    ]);

    expect(paths).toEqual([
      "/configuracoes/organizacao",
      "/configuracoes/equipe",
      "/gestao/perfil-integrador",
      "/propostas/templates",
      "/configuracoes/documentos",
      "/gestao/meus-planos",
      "/configuracoes",
      "/ajuda",
    ]);
  });

  it("should have the correct semantic order in admin section", () => {
    const adminItems = MENU_ITEMS.filter((item) => item.section === "admin");
    const labels = adminItems.map((item) => item.label);
    const paths = adminItems.map((item) => item.path);

    expect(labels).toEqual([
      "Métricas",
      "Integradores & Ativação",
      "Acessos Especiais",
      "Comercial",
      "Gestão de Planos",
      "Templates Globais",
      "Fornecedores",
      "Marcas",
      "Produtos Globais",
    ]);

    expect(paths).toEqual([
      "/admin/metricas",
      "/admin/integradores",
      "/admin/acessos-especiais",
      "/admin/comercial",
      "/admin/planos",
      "/admin/modelos-template",
      "/admin/distribuidores",
      "/admin/marcas",
      "/admin/produtos",
    ]);
  });

  it("should have the correct order in platform section", () => {
    const platformItems = MENU_ITEMS.filter((item) => item.section === "platform");
    const labels = platformItems.map((item) => item.label);
    const paths = platformItems.map((item) => item.path);

    expect(labels).toEqual(["Financiadores", "Fila de Financiamentos", "Comissões", "Sistema"]);

    expect(paths).toEqual([
      "/plataforma/financiadores",
      "/plataforma/financiamentos",
      "/plataforma/comissoes",
      "/admin/sistema",
    ]);
  });
});
