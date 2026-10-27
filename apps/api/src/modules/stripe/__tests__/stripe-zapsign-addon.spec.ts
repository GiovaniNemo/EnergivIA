import { describe, it, expect, vi, beforeEach } from "vitest";
import { StripeService } from "../stripe.service";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

describe("StripeService - ZapSign Optional Add-on (R$ 89,90/mês)", () => {
  let service: StripeService;
  let prismaMock: {
    plan: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    subscription: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    tenant: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    systemSetting: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };

  let stripeMock: {
    prices: {
      retrieve: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    products: {
      create: ReturnType<typeof vi.fn>;
    };
    customers: {
      retrieve: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    checkout: {
      sessions: {
        create: ReturnType<typeof vi.fn>;
        retrieve: ReturnType<typeof vi.fn>;
      };
    };
    subscriptions: {
      retrieve: ReturnType<typeof vi.fn>;
    };
    subscriptionItems: {
      create: ReturnType<typeof vi.fn>;
      del: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    const configService = {
      get: vi.fn((key: string) => {
        if (key === "STRIPE_SECRET_KEY") return "sk_test_123";
        if (key === "NEXT_PUBLIC_APP_URL") return "https://energivia.com.br";
        return undefined;
      }),
    } as unknown as ConfigService;

    prismaMock = {
      plan: {
        findUnique: vi.fn().mockResolvedValue({
          id: "plan_essencial",
          name: "Essencial",
          price: 97,
          interval: "month",
          stripeId: "price_plan_essencial_97",
        }),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub_db_1",
          tenantId: "tenant_1",
          planId: "plan_essencial",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_stripe_123",
          zapsignAddonActive: false,
          zapsignSubscriptionItemId: null,
          status: "active",
          currentPeriodEnd: new Date(),
        }),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "tenant_1",
          name: "Solar Integradora",
        }),
        update: vi.fn(),
      },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue({
          key: "STRIPE_ZAPSIGN_ADDON_PRICE_ID",
          value: "price_zapsign_8990",
        }),
        upsert: vi.fn().mockResolvedValue({
          key: "STRIPE_ZAPSIGN_ADDON_PRICE_ID",
          value: "price_zapsign_8990",
        }),
      },
    };

    service = new StripeService(configService, prismaMock as unknown as PrismaService);

    stripeMock = {
      prices: {
        retrieve: vi.fn().mockImplementation(async (priceId: string) => ({
          id: priceId,
          active: true,
          unit_amount: priceId === "price_zapsign_8990" ? 8990 : 9700,
          product: priceId === "price_zapsign_8990" ? "prod_zapsign" : "prod_plan",
        })),
        create: vi.fn().mockResolvedValue({
          id: "price_zapsign_8990",
          unit_amount: 8990,
          product: "prod_zapsign",
        }),
      },
      products: {
        create: vi.fn().mockResolvedValue({
          id: "prod_zapsign",
          name: "Add-on Assinatura Digital ZapSign - EnergivIA",
        }),
      },
      customers: {
        retrieve: vi.fn().mockResolvedValue({ id: "cus_123", deleted: false }),
        create: vi.fn().mockResolvedValue({ id: "cus_123" }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/pay/cs_test_123",
          }),
          retrieve: vi.fn(),
        },
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_stripe_123",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
          items: {
            data: [
              { id: "si_plan_1", price: { id: "price_plan_essencial_97", unit_amount: 9700 } },
              { id: "si_zapsign_1", price: { id: "price_zapsign_8990", unit_amount: 8990 } },
            ],
          },
        }),
      },
      subscriptionItems: {
        create: vi.fn().mockResolvedValue({
          id: "si_zapsign_new",
          price: { id: "price_zapsign_8990" },
        }),
        del: vi.fn().mockResolvedValue({ id: "si_zapsign_1", deleted: true }),
      },
    };

    // Inject mock stripe client
    (service as unknown as { stripe: unknown }).stripe = stripeMock;
  });

  it("inclui o ZapSign (R$ 89,90/mês) em line_items quando includeZapSignAddon = true (pré-marcado)", async () => {
    await service.createCheckoutSession(
      "plan_essencial",
      "tenant_1",
      "https://energivia.com.br",
      undefined,
      true
    );

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const callArg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(callArg.line_items).toEqual([
      { price: "price_plan_essencial_97", quantity: 1 },
      { price: "price_zapsign_8990", quantity: 1 },
    ]);
    expect(callArg.optional_items).toBeUndefined();
    expect(callArg.metadata.includeZapSignAddon).toBe("true");
  });

  it("envia o ZapSign (R$ 89,90/mês) em optional_items do Stripe quando includeZapSignAddon = false (desmarcado no card)", async () => {
    await service.createCheckoutSession(
      "plan_essencial",
      "tenant_1",
      "https://energivia.com.br",
      undefined,
      false
    );

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const callArg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(callArg.line_items).toEqual([{ price: "price_plan_essencial_97", quantity: 1 }]);
    expect(callArg.optional_items).toEqual([{ price: "price_zapsign_8990", quantity: 1 }]);
    expect(callArg.metadata.includeZapSignAddon).toBe("false");
  });

  it("cria o produto e preço de R$ 89,90 (8990 centavos) no Stripe se ainda não existir em SystemSetting", async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValueOnce(null);

    const priceId = await service.ensureZapSignAddonPrice();

    expect(stripeMock.products.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Add-on Assinatura Digital ZapSign - EnergivIA",
      })
    );
    expect(stripeMock.prices.create).toHaveBeenCalledWith({
      product: "prod_zapsign",
      unit_amount: 8990,
      currency: "brl",
      recurring: { interval: "month" },
    });
    expect(prismaMock.systemSetting.upsert).toHaveBeenCalled();
    expect(priceId).toBe("price_zapsign_8990");
  });

  it("permite ativar e desativar o Add-on ZapSign em uma assinatura já ativa via toggleZapSignAddon", async () => {
    // Ativar
    const activateRes = await service.toggleZapSignAddon("tenant_1", true);
    expect(stripeMock.subscriptionItems.create).toHaveBeenCalledWith({
      subscription: "sub_stripe_123",
      price: "price_zapsign_8990",
      quantity: 1,
    });
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      data: {
        zapsignAddonActive: true,
        zapsignSubscriptionItemId: "si_zapsign_new",
      },
    });
    expect(activateRes.zapsignAddonActive).toBe(true);

    // Desativar
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      id: "sub_db_1",
      tenantId: "tenant_1",
      planId: "plan_essencial",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_stripe_123",
      zapsignAddonActive: true,
      zapsignSubscriptionItemId: "si_zapsign_1",
      status: "active",
      currentPeriodEnd: new Date(),
    });

    const deactivateRes = await service.toggleZapSignAddon("tenant_1", false);
    expect(stripeMock.subscriptionItems.del).toHaveBeenCalledWith("si_zapsign_1");
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      data: {
        zapsignAddonActive: false,
        zapsignSubscriptionItemId: null,
      },
    });
    expect(deactivateRes.zapsignAddonActive).toBe(false);
  });
});
