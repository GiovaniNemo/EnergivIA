"use client";

import { useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";

interface PaymentFormProps {
  planId: string;
  planName?: string;
  buttonText?: string;
  className?: string;
}

export default function PaymentForm({ planId, planName, buttonText, className }: PaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentOrganization } = useOrganization();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!currentOrganization) {
      setError("Usuário não está associado a uma organização/tenant.");
      setLoading(false);
      return;
    }

    try {
      const returnUrl = typeof window !== "undefined" ? window.location.origin : undefined;

      const response = await fetch("/api/proxy/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          tenantId: currentOrganization.id,
          returnUrl,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao iniciar assinatura");
      }

      const { url } = await response.json();

      // Redireciona o usuário para a página de Checkout segura do Stripe
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL de checkout não retornada pelo servidor.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao comunicar com o servidor.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className={
          className ||
          "w-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        }
      >
        {loading ? "Iniciando Checkout..." : buttonText || `Assinar Plano ${planName || ""}`.trim()}
      </button>
      <p className="text-xs text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-1">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        Pagamento 100% Seguro via Stripe.
      </p>
    </form>
  );
}
