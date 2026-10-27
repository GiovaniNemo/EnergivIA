import { describe, it, expect, vi, beforeEach } from "vitest";
import { StripeService } from "../stripe.service";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/shared/prisma/prisma.service";

describe("StripeService - Sincronização de Preços e Segurança de Assinatura", () => {
  let service: StripeService;
  let prismaMock: {
    plan: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    subscription: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
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
          id: "plan_plus_id",
          name: "Plus",
          price: 397.0, // R$ 397,00 no banco de dados da plataforma
          interval: "month",
          stripeId: "price_old_399_stripe", // Preço legado de R$ 399,99 gravado no banco
        }),
        findFirst: vi.fn(),
        update: vi.fn().mockImplementation(async ({ data }) => ({
          id: "plan_plus_id",
          name: "Plus",
          price: 397.0,
          interval: "month",
          stripeId: data.stripeId,
        })),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub_1",
          tenantId: "tenant_plus",
          stripeCustomerId: "cus_plus_123",
          status: "active",
        }),
        create: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "tenant_plus",
          name: "Empresa Solar Plus",
          settings: {},
        }),
        update: vi.fn(),
      },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue({
          key: "STRIPE_ZAPSIGN_ADDON_PRICE_ID",
          value: "price_zapsign_5990",
        }),
        upsert: vi.fn(),
      },
    };

    stripeMock = {
      prices: {
        retrieve: vi.fn(),
        create: vi.fn(),
      },
      products: {
        create: vi.fn().mockResolvedValue({
          id: "prod_plus_new",
          name: "Plano Plus - EnergivIA",
        }),
      },
      customers: {
        retrieve: vi.fn().mockResolvedValue({ id: "cus_plus_123", deleted: false }),
        create: vi.fn().mockResolvedValue({ id: "cus_plus_123" }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_plus",
            url: "https://checkout.stripe.com/pay/cs_test_plus",
          }),
          retrieve: vi.fn(),
        },
      },
    };

    service = new StripeService(configService, prismaMock as unknown as PrismaService);
    (service as unknown as { stripe: unknown }).stripe = stripeMock;
  });

  it("detecta divergência de valor entre Stripe (R$ 399,99) e plano (R$ 397,00) e cria novo preço sincronizado", async () => {
    // Simula que o Stripe tem o preço legado com unit_amount = 39999 (R$ 399,99)
    stripeMock.prices.retrieve.mockImplementation(async (priceId: string) => {
      if (priceId === "price_old_399_stripe") {
        return {
          id: "price_old_399_stripe",
          active: true,
          unit_amount: 39999, // 399.99 BRL (maior que o plano de R$ 397,00)
          currency: "brl",
          recurring: { interval: "month" },
          product: "prod_plus_existing",
        };
      }
      if (priceId === "price_zapsign_5990") {
        return {
          id: "price_zapsign_5990",
          active: true,
          unit_amount: 5990,
          currency: "brl",
          recurring: { interval: "month" },
          product: "prod_zapsign",
        };
      }
      return null;
    });

    // Mock da criação do novo preço sincronizado com 39700 centavos (R$ 397,00)
    stripeMock.prices.create.mockResolvedValueOnce({
      id: "price_plus_sync_39700",
      unit_amount: 39700,
      currency: "brl",
      recurring: { interval: "month" },
      product: "prod_plus_existing",
    });

    await service.createCheckoutSession(
      "plan_plus_id",
      "tenant_plus",
      "https://energivia.com.br",
      undefined,
      false
    );

    // 1. Deve ter chamado stripe.prices.create com o produto existente e o valor correto de R$ 397,00
    expect(stripeMock.prices.create).toHaveBeenCalledWith({
      product: "prod_plus_existing",
      unit_amount: 39700, // 397 * 100 centavos
      currency: "brl",
      recurring: { interval: "month" },
    });

    // 2. Deve ter atualizado o stripeId no banco de dados para o novo preço
    expect(prismaMock.plan.update).toHaveBeenCalledWith({
      where: { id: "plan_plus_id" },
      data: { stripeId: "price_plus_sync_39700" },
    });

    // 3. A sessão de checkout deve ter sido criada com o novo preço sincronizado
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const sessionArgs = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(sessionArgs.line_items).toEqual([{ price: "price_plus_sync_39700", quantity: 1 }]);
  });

  it("reutiliza o stripeId existente quando o unit_amount do Stripe bate exatamente com o valor do plano", async () => {
    // Simula que o Stripe já possui o preço correto de R$ 397,00 (39700 centavos)
    stripeMock.prices.retrieve.mockImplementation(async (priceId: string) => {
      if (priceId === "price_old_399_stripe") {
        return {
          id: "price_old_399_stripe",
          active: true,
          unit_amount: 39700, // Exato R$ 397,00
          currency: "brl",
          recurring: { interval: "month" },
          product: "prod_plus_existing",
        };
      }
      if (priceId === "price_zapsign_5990") {
        return {
          id: "price_zapsign_5990",
          active: true,
          unit_amount: 5990,
          currency: "brl",
          recurring: { interval: "month" },
          product: "prod_zapsign",
        };
      }
      return null;
    });

    await service.createCheckoutSession(
      "plan_plus_id",
      "tenant_plus",
      "https://energivia.com.br",
      undefined,
      false
    );

    // Não deve criar novo preço para o plano no Stripe
    expect(stripeMock.prices.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ unit_amount: 39700 })
    );
    expect(prismaMock.plan.update).not.toHaveBeenCalled();

    // Deve usar o preço já existente
    const sessionArgs = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(sessionArgs.line_items).toEqual([{ price: "price_old_399_stripe", quantity: 1 }]);
  });

  it("NUNCA cria registro em Subscription no banco de dados apenas ao abrir a tela de checkout (evita ativação indevida)", async () => {
    // Simula tenant sem assinatura ativa prévia
    prismaMock.subscription.findUnique.mockResolvedValueOnce(null);

    stripeMock.prices.retrieve.mockImplementation(async (priceId: string) => {
      if (priceId === "price_old_399_stripe") {
        return {
          id: "price_old_399_stripe",
          active: true,
          unit_amount: 39700,
          currency: "brl",
          recurring: { interval: "month" },
          product: "prod_plus_existing",
        };
      }
      return null;
    });

    await service.createCheckoutSession(
      "plan_plus_id",
      "tenant_plus",
      "https://energivia.com.br",
      undefined,
      false
    );

    // CRÍTICO: prisma.subscription.create NÃO pode ser chamado no createCheckoutSession!
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });

  it("getSubscriptionByTenant ignora assinaturas com status incomplete, canceled ou unpaid e retorna null", async () => {
    // 1. Status incomplete
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      id: "sub_inc",
      tenantId: "tenant_plus",
      planId: "plan_plus_id",
      status: "incomplete",
    });
    const resIncomplete = await service.getSubscriptionByTenant("tenant_plus");
    expect(resIncomplete).toBeNull();

    // 2. Status canceled
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      id: "sub_canc",
      tenantId: "tenant_plus",
      planId: "plan_plus_id",
      status: "canceled",
    });
    const resCanceled = await service.getSubscriptionByTenant("tenant_plus");
    expect(resCanceled).toBeNull();

    // 3. Status unpaid
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      id: "sub_unp",
      tenantId: "tenant_plus",
      planId: "plan_plus_id",
      status: "unpaid",
    });
    const resUnpaid = await service.getSubscriptionByTenant("tenant_plus");
    expect(resUnpaid).toBeNull();
  });

  it("getSubscriptionByTenant retorna a assinatura quando status é active ou trialing", async () => {
    // 1. Active
    const activeSub = {
      id: "sub_active",
      tenantId: "tenant_plus",
      planId: "plan_plus_id",
      status: "active",
      plan: { name: "Plus", price: 397 },
    };
    prismaMock.subscription.findUnique.mockResolvedValueOnce(activeSub);
    const resActive = await service.getSubscriptionByTenant("tenant_plus");
    expect(resActive).toEqual(activeSub);

    // 2. Trialing
    const trialingSub = {
      id: "sub_trialing",
      tenantId: "tenant_plus",
      planId: "plan_plus_id",
      status: "trialing",
      plan: { name: "Plus", price: 397 },
    };
    prismaMock.subscription.findUnique.mockResolvedValueOnce(trialingSub);
    const resTrialing = await service.getSubscriptionByTenant("tenant_plus");
    expect(resTrialing).toEqual(trialingSub);
  });
});
