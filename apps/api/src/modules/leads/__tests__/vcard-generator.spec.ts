/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  formatInternationalPhone,
  generateVCard,
  ContactVCardItem,
} from "../utils/vcard-generator";

describe("vCard Generator & Phone Normalization", () => {
  describe("formatInternationalPhone", () => {
    it("deve normalizar telefone brasileiro com DDD para E.164 (+55)", () => {
      expect(formatInternationalPhone("44998215497")).toBe("+5544998215497");
      expect(formatInternationalPhone("(44) 99821-5497")).toBe("+5544998215497");
      expect(formatInternationalPhone("11987654321")).toBe("+5511987654321");
    });

    it("deve preservar código do país quando já vier com 55", () => {
      expect(formatInternationalPhone("5544998215497")).toBe("+5544998215497");
      expect(formatInternationalPhone("+55 44 99821-5497")).toBe("+5544998215497");
    });

    it("deve retornar vazio para entradas sem dígitos válidos", () => {
      expect(formatInternationalPhone("")).toBe("");
      expect(formatInternationalPhone("abc")).toBe("");
      expect(formatInternationalPhone("---")).toBe("");
    });
  });

  describe("generateVCard", () => {
    it("deve gerar vCard 3.0 válido com campos obrigatórios", () => {
      const contacts: ContactVCardItem[] = [
        {
          name: "João Silva",
          phone: "44998215497",
          email: "joao@exemplo.com",
          company: "Solar Tech",
          role: "Integrador Solar",
        },
      ];

      const vcf = generateVCard(contacts);

      expect(vcf).toContain("BEGIN:VCARD");
      expect(vcf).toContain("VERSION:3.0");
      expect(vcf).toContain("FN:João Silva");
      expect(vcf).toContain("N:João Silva;;;;");
      expect(vcf).toContain("TEL;TYPE=CELL,VOICE:+5544998215497");
      expect(vcf).toContain("ORG:Solar Tech");
      expect(vcf).toContain("EMAIL;TYPE=INTERNET:joao@exemplo.com");
      expect(vcf).toContain("NOTE:Contato cadastrado no EnergivIA (Integrador Solar)");
      expect(vcf).toContain("END:VCARD");
    });

    it("deve sanitizar quebras de linha e ponto e vírgula no nome", () => {
      const contacts: ContactVCardItem[] = [
        {
          name: "Maria\nOliveira; Advogada",
          phone: "11988887777",
        },
      ];

      const vcf = generateVCard(contacts);

      expect(vcf).toContain("FN:Maria Oliveira Advogada");
      expect(vcf).not.toContain("FN:Maria\n");
    });

    it("deve ignorar contatos com número de telefone inválido ou muito curto", () => {
      const contacts: ContactVCardItem[] = [
        {
          name: "Inválido 1",
          phone: "123",
        },
        {
          name: "Válido",
          phone: "44999998888",
        },
      ];

      const vcf = generateVCard(contacts);

      expect(vcf).not.toContain("FN:Inválido 1");
      expect(vcf).toContain("FN:Válido");
    });

    it("deve concatenar múltiplos contatos para importação em lote", () => {
      const contacts: ContactVCardItem[] = [
        { name: "Cliente 1", phone: "44999991111" },
        { name: "Cliente 2", phone: "44999992222" },
      ];

      const vcf = generateVCard(contacts);
      const vcardCount = (vcf.match(/BEGIN:VCARD/g) || []).length;
      expect(vcardCount).toBe(2);
    });
  });

  describe("LeadsService.exportContactsVCard", () => {
    it("deve buscar leads e conversas do WhatsApp, deduplicar por telefone e gerar o .vcf", async () => {
      const { LeadsService } = await import("../leads.service");
      const mockPrisma = {
        lead: {
          findMany: () =>
            Promise.resolve([
              {
                name: "Carlos Solar",
                whatsapp: "44999991234",
                email: "carlos@solar.com",
                company: "Carlos ME",
              },
            ]),
        },
        conversation: {
          findMany: () =>
            Promise.resolve([
              {
                title: "5544999991234",
                metadata: {
                  contactName: "Carlos Solar Atualizado",
                },
              },
              {
                title: "5511988889999",
                metadata: {
                  contactName: "Ana Silva",
                  role: "Integrador Solar",
                },
              },
            ]),
        },
      };

      const service = new LeadsService(mockPrisma as any, {} as any);
      const res = await service.exportContactsVCard("tenant-123");

      expect(res.totalContacts).toBe(2);
      expect(res.fileName).toMatch(/^contatos-energivia-\d{4}-\d{2}-\d{2}\.vcf$/);
      expect(res.vcard).toContain("Carlos Solar");
      expect(res.vcard).toContain("Ana Silva");
      expect(res.vcard).toContain("+5544999991234");
      expect(res.vcard).toContain("+5511988889999");
    });
  });
});
