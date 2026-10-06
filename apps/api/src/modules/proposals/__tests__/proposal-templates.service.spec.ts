/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ProposalTemplatesService } from "../proposal-templates.service";

describe("ProposalTemplatesService - Trial Mode & Official Templates", () => {
  let service: ProposalTemplatesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: vi.fn(),
      },
      proposalTemplate: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      proposalTemplateRevision: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      proposalTemplateBlueprint: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    service = new ProposalTemplatesService(mockPrisma);
  });

  it("should auto-seed default official template when listing templates for an organization with none", async () => {
    mockPrisma.proposalTemplate.findMany.mockResolvedValueOnce([]); // empty list
    mockPrisma.proposalTemplateBlueprint.findFirst.mockResolvedValueOnce({
      id: "blueprint-1",
      name: "Template de Proposta Padrão EnergivIA",
      description: "Modelo oficial padrão",
      document: { theme: { primaryColor: "#000" }, sections: [] },
    });

    const createdTemplate = {
      id: "seeded-1",
      tenantId: "tenant-trial",
      name: "Template de Proposta Padrão EnergivIA",
      description: "Modelo oficial padrão",
      version: 1,
      isDefault: true,
      status: "PUBLISHED",
      config: { theme: { primaryColor: "#000" }, sections: [] },
    };
    mockPrisma.proposalTemplate.create.mockResolvedValueOnce(createdTemplate);
    mockPrisma.proposalTemplateRevision.create.mockResolvedValueOnce({ id: "rev-1" });

    const result = await service.list("tenant-trial");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("seeded-1");
    expect(result[0].name).toBe("Template de Proposta Padrão EnergivIA");
    expect(mockPrisma.proposalTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-trial",
          isDefault: true,
          status: "PUBLISHED",
        }),
      })
    );
  });

  it("should allow a trial organization to import/load an official template (isOfficial: true)", async () => {
    // Tenant in Trial mode has maxCustomTemplates: 0
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: "tenant-trial",
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days left
      subscription: null, // Trial
    });

    const officialTemplate = {
      id: "template-official-1",
      tenantId: "tenant-trial",
      name: "Solar Residencial Oficial",
      description: "Modelo oficial",
      version: 1,
      isDefault: false,
      status: "PUBLISHED",
      config: { theme: { primaryColor: "#0f172a" }, sections: [] },
    };
    mockPrisma.proposalTemplate.create.mockResolvedValueOnce(officialTemplate);
    mockPrisma.proposalTemplateRevision.create.mockResolvedValueOnce({ id: "rev-1" });

    const result = await service.create("tenant-trial", {
      name: "Solar Residencial Oficial",
      description: "Modelo oficial",
      isOfficial: true,
      config: { theme: { primaryColor: "#0f172a" }, sections: [] } as any,
    });

    expect(result.id).toBe("template-official-1");
    expect(mockPrisma.proposalTemplate.create).toHaveBeenCalled();
  });

  it("should BLOCK a trial organization from creating a custom template from scratch (isOfficial: false/undefined)", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: "tenant-trial",
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subscription: null,
    });

    await expect(
      service.create("tenant-trial", {
        name: "Meu Template do Zero",
        description: "Template scratch",
        isOfficial: false,
        config: { theme: { primaryColor: "#123456" }, sections: [] } as any,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("should BLOCK a trial organization from updating/editing template layout or config", async () => {
    mockPrisma.proposalTemplate.findFirst.mockResolvedValueOnce({
      id: "template-1",
      tenantId: "tenant-trial",
      name: "Template Padrão",
      version: 1,
      status: "PUBLISHED",
      config: { theme: { primaryColor: "#000" }, sections: [] },
    });

    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: "tenant-trial",
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subscription: null,
    });

    await expect(
      service.update("tenant-trial", "template-1", {
        config: { theme: { primaryColor: "#ff0000" } } as any,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("should ALLOW a trial organization to set an existing official template as default (isDefault: true)", async () => {
    mockPrisma.proposalTemplate.findFirst.mockResolvedValueOnce({
      id: "template-1",
      tenantId: "tenant-trial",
      name: "Template Padrão",
      version: 1,
      status: "PUBLISHED",
      config: { theme: { primaryColor: "#000" }, sections: [] },
    });

    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: "tenant-trial",
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subscription: null,
    });

    mockPrisma.proposalTemplate.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.proposalTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      tenantId: "tenant-trial",
      name: "Template Padrão",
      isDefault: true,
      status: "PUBLISHED",
      version: 1,
      config: { theme: { primaryColor: "#000" }, sections: [] },
    });

    const result = await service.update("tenant-trial", "template-1", {
      isDefault: true,
    });

    expect(result.isDefault).toBe(true);
    expect(mockPrisma.proposalTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "template-1" },
        data: expect.objectContaining({ isDefault: true }),
      })
    );
  });

  it("should BLOCK a trial organization from duplicating templates", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: "tenant-trial",
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subscription: null,
    });

    await expect(service.duplicate("tenant-trial", "template-1")).rejects.toThrow(
      BadRequestException
    );
  });
});
