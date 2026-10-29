/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsService } from "../organizations.service";
import { CreateOrganizationDto } from "../dto/create-organization.dto";

describe("Organizations Referral Attribution", () => {
  let service: OrganizationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: "org-new-1",
            name: data.name,
            slug: data.slug,
            salesRepId: data.salesRepId,
            referralCode: data.referralCode,
          })
        ),
      },
      user: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where?.referralCode) {
            const code = where.referralCode.equals || where.referralCode;
            if (code?.toLowerCase() === "giovani") {
              return Promise.resolve({
                id: "user-rep-giovani",
                name: "Giovani Vendas",
                referralCode: "giovani",
              });
            }
            return Promise.resolve(null);
          }
          return Promise.resolve({
            id: "user-owner-1",
            name: "Novo Integrador",
            email: "integrador@solar.com",
            phone: "11988887777",
          });
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: "user-owner-1",
          name: "Novo Integrador",
          email: "integrador@solar.com",
        }),
        update: vi.fn().mockResolvedValue({ id: "user-owner-1" }),
      },
      organizationMember: {
        create: vi.fn().mockResolvedValue({ id: "mem-1" }),
        findFirst: vi.fn().mockResolvedValue({ id: "mem-1" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      termsAcceptanceLog: {
        create: vi.fn().mockResolvedValue({ id: "log-1" }),
      },
      proposalTemplateBlueprint: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      proposalTemplate: {
        create: vi.fn().mockResolvedValue({ id: "tpl-1" }),
      },
      inboundLeadAttribution: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where?.phoneDigits?.in?.some((p: string) => p.includes("996851400"))) {
            return Promise.resolve({
              id: "attr-lead-123",
              salesRepId: "user-rep-giovani",
              referralCode: "giovani",
            });
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockResolvedValue({ id: "attr-lead-123" }),
      },
    };

    service = new OrganizationsService(mockPrisma);
  });

  it("should assign salesRepId and referralCode when a valid referral code is provided", async () => {
    const dto: CreateOrganizationDto = {
      name: "Solar Express",
      referralCode: "giovani",
      termsAccepted: true,
    };

    const result = await service.create("user-owner-1", dto);

    expect(mockPrisma.tenant.create).toHaveBeenCalled();
    const createData = mockPrisma.tenant.create.mock.calls[0][0].data;
    expect(createData.salesRepId).toBe("user-rep-giovani");
    expect(createData.referralCode).toBe("giovani");
    expect(result.salesRepId).toBe("user-rep-giovani");
  });

  it("should set salesRepId to null when an invalid referral code is provided", async () => {
    const dto: CreateOrganizationDto = {
      name: "Solar Express",
      referralCode: "codigo-inexistente",
      termsAccepted: true,
    };

    const result = await service.create("user-owner-1", dto);

    expect(mockPrisma.tenant.create).toHaveBeenCalled();
    const createData = mockPrisma.tenant.create.mock.calls[0][0].data;
    expect(createData.salesRepId).toBeNull();
    expect(createData.referralCode).toBeNull();
    expect(result.salesRepId).toBeNull();
  });

  it("should set salesRepId to null when referralCode is omitted and no phone attribution matches", async () => {
    const dto: CreateOrganizationDto = {
      name: "Solar Sem Indicacao",
      termsAccepted: true,
    };

    const result = await service.create("user-owner-1", dto);

    expect(mockPrisma.tenant.create).toHaveBeenCalled();
    const createData = mockPrisma.tenant.create.mock.calls[0][0].data;
    expect(createData.salesRepId).toBeNull();
    expect(createData.referralCode).toBeNull();
    expect(result.salesRepId).toBeNull();
  });

  it("should fallback to phone matching in InboundLeadAttribution when referralCode is omitted", async () => {
    const dto: CreateOrganizationDto = {
      name: "Solar Vinda do WhatsApp",
      phone: "(34) 99685-1400",
      termsAccepted: true,
    };

    const result = await service.create("user-owner-1", dto);

    expect(mockPrisma.tenant.create).toHaveBeenCalled();
    const createData = mockPrisma.tenant.create.mock.calls[0][0].data;
    expect(createData.salesRepId).toBe("user-rep-giovani");
    expect(createData.referralCode).toBe("giovani");
    expect(result.salesRepId).toBe("user-rep-giovani");
    expect(mockPrisma.inboundLeadAttribution.update).toHaveBeenCalledWith({
      where: { id: "attr-lead-123" },
      data: {
        convertedTenantId: "org-new-1",
        convertedAt: expect.any(Date),
      },
    });
  });
});
