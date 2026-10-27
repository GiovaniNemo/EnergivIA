/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentTemplateService } from "../document-template.service";
import { DocumentType } from "@prisma/client";

describe("DocumentTemplateService", () => {
  let service: DocumentTemplateService;
  let mockPdfRenderer: any;

  beforeEach(() => {
    mockPdfRenderer = {
      renderHtmlToPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 Mock Contract Content")),
    };

    service = new DocumentTemplateService(mockPdfRenderer);
  });

  it("should replace dynamic tags in HTML template", () => {
    const rawTemplate =
      "Contrato de {{nome_cliente}}, CPF {{cpf_cliente}}, potência {{potencia_kwp}} kWp.";
    const variables = {
      nome_cliente: "Maria Souza",
      cpf_cliente: "123.456.789-00",
      potencia_kwp: "7.50",
    };

    const rendered = service.replaceTags(rawTemplate, variables);
    expect(rendered).toBe("Contrato de Maria Souza, CPF 123.456.789-00, potência 7.50 kWp.");
  });

  it("should generate HTML for CONTRATO_PF with all client and system variables", () => {
    const data = {
      nome_cliente: "João da Silva",
      cpf_cliente: "111.222.333-44",
      rg_cliente: "12.345.678-9",
      endereco_instalacao: "Rua das Flores, 123",
      cidade_instalacao: "Campinas",
      estado_instalacao: "SP",
      cep_instalacao: "13000-000",
      concessionaria: "CPFL Paulista",
      numero_uc: "12345678",
      potencia_kwp: "5.40",
      valor_total: "R$ 21.000,00",
      forma_pagamento: "À Vista / Financiamento",
      nome_empresa: "EnergivIA Soluções Solares",
      nome_vendedor: "Carlos Consultor",
      data_atual: "27 de outubro de 2026",
    };

    const html = service.buildDocumentHtml(DocumentType.CONTRATO_PF, data);

    expect(html).toContain(
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE SISTEMA FOTOVOLTAICO"
    );
    expect(html).toContain("João da Silva");
    expect(html).toContain("111.222.333-44");
    expect(html).toContain("5.40");
    expect(html).toContain("CPFL Paulista");
    expect(html).toContain("R$ 21.000,00");
  });

  it("should generate HTML for PROCURACAO_PF suitable for concessionaire homologation", () => {
    const data = {
      nome_cliente: "João da Silva",
      cpf_cliente: "111.222.333-44",
      rg_cliente: "12.345.678-9",
      endereco_instalacao: "Rua das Flores, 123",
      cidade_instalacao: "Campinas",
      estado_instalacao: "SP",
      concessionaria: "CPFL Paulista",
      numero_uc: "12345678",
      nome_empresa: "EnergivIA Soluções Solares",
      data_atual: "27 de outubro de 2026",
    };

    const html = service.buildDocumentHtml(DocumentType.PROCURACAO_PF, data);

    expect(html).toContain("PROCURAÇÃO ESPECÍFICA - ACESSO À REDE DE DISTRIBUIÇÃO");
    expect(html).toContain("CPFL Paulista");
    expect(html).toContain("12345678");
    expect(html).toContain("João da Silva");
    expect(html).toContain("EnergivIA Soluções Solares");
  });

  it("should render PDF buffer and compute SHA-256 hash", async () => {
    const html = "<html><body><h1>Teste de Contrato</h1></body></html>";
    const { pdfBuffer, sha256Hash } = await service.generatePdfWithHash(html);

    expect(mockPdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith({ html });
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(typeof sha256Hash).toBe("string");
    expect(sha256Hash.length).toBe(64); // SHA-256 hex string length
  });
});
