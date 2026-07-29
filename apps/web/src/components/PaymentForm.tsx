'use client';

import { useState } from 'react';
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// NOTA: Para rodar, instale: npm install @stripe/stripe-js @stripe/react-stripe-js
// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

function CheckoutForm({ planId }: { planId: string }) {
  // const stripe = useStripe();
  // const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    /*
    if (!stripe || !elements) return;

    setLoading(true);
    const cardElement = elements.getElement(CardElement);

    // O Stripe envia os dados do cartão criptografados DIRETAMENTE para a API deles.
    // O nosso servidor NUNCA tem acesso ao número do cartão (PCI Compliance).
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement!,
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Erro ao processar cartão');
      setLoading(false);
      return;
    }

    // Apenas o token seguro (paymentMethod.id) é enviado ao nosso backend.
    try {
      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          paymentMethodId: paymentMethod.id,
        }),
      });

      if (!response.ok) throw new Error('Erro na assinatura');
      alert('Assinatura realizada com sucesso!');
    } catch (err) {
      setError('Erro ao concluir assinatura no sistema.');
    }
    setLoading(false);
    */
    alert('Simulação de assinatura: Stripe não configurado ainda.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Dados de Pagamento</h3>
      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
        {/* <CardElement options={{ hidePostalCode: true }} /> */}
        <p className="text-sm text-gray-500 text-center">Formulário Seguro do Stripe será renderizado aqui.</p>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processando...' : 'Confirmar Assinatura Seguro'}
      </button>
      <p className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        Pagamento 100% Seguro. Seus dados não são armazenados.
      </p>
    </form>
  );
}

export default function PaymentWrapper({ planId }: { planId: string }) {
  return (
    // <Elements stripe={stripePromise}>
    <CheckoutForm planId={planId} />
    // </Elements>
  );
}
