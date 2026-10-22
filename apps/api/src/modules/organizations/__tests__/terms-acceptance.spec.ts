/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsController } from "../organizations.controller";
import { OrganizationsService } from "../organizations.service";
import { CreateOrganizationDto } from "../dto/create-organization.dto";

describe("Terms Acceptance & Device Telemetry", () => {
  describe("OrganizationsController", () => {
    let controller: OrganizationsController;
    let mockService: any;

    beforeEach(() => {
      mockService = {
        create: vi.fn().mockResolvedValue({ id: "org-1", name: "Solar Test" }),
        getTermsAcceptance: vi.fn().mockResolvedValue({
          termsAccepted: true,
          termsVersion: "2026-09-22-v1",
          auditLogs: [],
        }),
      };
      controller = new OrganizationsController(mockService);
    });

    it("should extract client IP and User-Agent from request headers", async () => {
      const user = { sub: "user-123" } as any;
      const dto: CreateOrganizationDto = {
        name: "Solar Express",
        termsAccepted: true,
      };
      const req: any = {
        headers: {
          "x-forwarded-for": "177.136.24.10, 10.0.0.1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
        },
      };

      await controller.create(user, dto, req);

      expect(mockService.create).toHaveBeenCalledWith("user-123", dto, {
        ip: "177.136.24.10",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
      });
    });

    it("should fall back to clientDeviceInfo.userAgent if request header is missing", async () => {
      const user = { sub: "user-456" } as any;
      const dto: CreateOrganizationDto = {
        name: "Solar Fallback",
        termsAccepted: true,
        clientDeviceInfo: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
          screenResolution: "393x852",
          timezone: "America/Sao_Paulo",
          language: "pt-BR",
        },
      };
      const req: any = {
        headers: {},
        ip: "201.82.90.15",
      };

      await controller.create(user, dto, req);

      expect(mockService.create).toHaveBeenCalledWith("user-456", dto, {
        ip: "201.82.90.15",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
      });
    });

    it("should forward getTermsAcceptance call", async () => {
      const user = { sub: "user-123" } as any;
      const res = await controller.getTermsAcceptance("org-99", user);

      expect(mockService.getTermsAcceptance).toHaveBeenCalledWith("org-99", "user-123");
      expect(res.termsAccepted).toBe(true);
    });
  });

  describe("OrganizationsService - Terms Acceptance Recording", () => {
    let service: OrganizationsService;
    let mockPrisma: any;
    let mockEmailService: any;
    let mockWhatsappPairing: any;
    let mockAdminAlerts: any;

    beforeEach(() => {
      mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            name: "Carlos Integrador",
            email: "carlos@solar.com.br",
          }),
        },
        tenant: {
          findFirst: vi.fn().mockResolvedValue(null),
          findUnique: vi.fn().mockResolvedValue({
            id: "org-1",
            settings: {
              termsAccepted: true,
              termsAcceptedAt: "2026-10-22T20:00:00.000Z",
              termsVersion: "2026-09-22-v1",
              termsAcceptanceLog: {
                acceptedAt: "2026-10-22T20:00:00.000Z",
                ip: "187.25.10.5",
                userAgent: "Mozilla/5.0 Chrome",
              },
            },
          }),
          create: vi.fn().mockImplementation((args) => ({
            id: "org-1",
            ...args.data,
          })),
        },
        termsAcceptanceLog: {
          create: vi.fn().mockResolvedValue({ id: "log-1" }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: "log-1",
              organizationId: "org-1",
              userId: "user-1",
              userName: "Carlos Integrador",
              userEmail: "carlos@solar.com.br",
              termsVersion: "2026-09-22-v1",
              termsType: "TERMS_OF_USE_AND_TECHNICAL_RESPONSIBILITY",
              acceptedAt: new Date("2026-10-22T20:00:00.000Z"),
              ipAddress: "187.25.10.5",
              userAgent: "Mozilla/5.0 Chrome",
              channel: "WEB_ONBOARDING",
              documentSnapshot: "Declaro que li e concordo com os Termos...",
              metadata: {
                screenResolution: "1920x1080",
                timezone: "America/Sao_Paulo",
                language: "pt-BR",
              },
            },
          ]),
        },
        organizationMember: {
          create: vi.fn().mockResolvedValue({ id: "mem-1" }),
          findFirst: vi.fn().mockResolvedValue({ id: "mem-1" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        proposalTemplateBlueprint: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        proposalTemplate: {
          create: vi.fn().mockResolvedValue({ id: "tpl-1" }),
        },
      };

      mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue(true),
      };

      mockWhatsappPairing = {
        generatePairingCode: vi.fn().mockResolvedValue({ code: "123-456" }),
      };

      mockAdminAlerts = {
        notifyNewUserRegistration: vi.fn().mockResolvedValue(true),
      };

      service = new OrganizationsService(
        mockPrisma,
        mockEmailService,
        mockWhatsappPairing,
        mockAdminAlerts
      );
    });

    it("should persist terms audit logs with IP, userAgent and device telemetry", async () => {
      const dto: CreateOrganizationDto = {
        name: "Solar Alfa",
        cnpj: "12.345.678/0001-90",
        termsAccepted: true,
        termsVersion: "2026-09-22-v1",
        clientDeviceInfo: {
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          language: "pt-BR",
          screenResolution: "1920x1080",
          timezone: "America/Sao_Paulo",
        },
      };

      const clientInfo = {
        ip: "189.40.10.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      };

      await service.create("user-1", dto, clientInfo);

      // Verify tenant settings log
      expect(mockPrisma.tenant.create).toHaveBeenCalled();
      const tenantCall = mockPrisma.tenant.create.mock.calls[0][0];
      expect(tenantCall.data.settings.termsAccepted).toBe(true);
      expect(tenantCall.data.settings.termsAcceptanceLog).toMatchObject({
        userId: "user-1",
        userEmail: "carlos@solar.com.br",
        userName: "Carlos Integrador",
        ip: "189.40.10.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        version: "2026-09-22-v1",
        deviceInfo: {
          screenResolution: "1920x1080",
          timezone: "America/Sao_Paulo",
          language: "pt-BR",
        },
      });

      // Verify termsAcceptanceLog audit table insertion
      expect(mockPrisma.termsAcceptanceLog.create).toHaveBeenCalled();
      const logCall = mockPrisma.termsAcceptanceLog.create.mock.calls[0][0];
      expect(logCall.data).toMatchObject({
        organizationId: "org-1",
        userId: "user-1",
        userEmail: "carlos@solar.com.br",
        userName: "Carlos Integrador",
        termsVersion: "2026-09-22-v1",
        termsType: "TERMS_OF_USE_AND_TECHNICAL_RESPONSIBILITY",
        ipAddress: "189.40.10.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        channel: "WEB_ONBOARDING",
        metadata: {
          organizationName: "Solar Alfa",
          cnpj: "12.345.678/0001-90",
          screenResolution: "1920x1080",
          timezone: "America/Sao_Paulo",
          language: "pt-BR",
          reportedUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
      });
      expect(logCall.data.documentSnapshot).toContain("ENERGIVIA LTDA");
    });

    it("should retrieve terms acceptance details and audit logs", async () => {
      const result = await service.getTermsAcceptance("org-1", "user-1");

      expect(result.termsAccepted).toBe(true);
      expect(result.termsVersion).toBe("2026-09-22-v1");
      expect(result.auditLogs).toHaveLength(1);
      expect(result.auditLogs[0].ipAddress).toBe("187.25.10.5");
      expect(result.auditLogs[0].metadata).toMatchObject({
        screenResolution: "1920x1080",
      });
    });
  });
});
