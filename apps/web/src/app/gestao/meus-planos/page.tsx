import React from 'react';
import PaymentWrapper from '@/components/PaymentForm';

// Em um cenário real, esses dados viriam da API (fetch('/api/plans'))
const MOCK_PLANS = [
  {
    id: 'plan_1',
    name: 'Básico',
    price: 99.90,
    features: ['Até 50 propostas/mês', 'Suporte por email', 'Acesso ao CRM básico'],
  },
  {
    id: 'plan_2',
    name: 'Profissional',
    price: 199.90,
    features: ['Propostas ilimitadas', 'Suporte WhatsApp', 'CRM Completo', 'Integração de pagamentos'],
  }
];

export default function MeusPlanosPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Meus Planos</h1>
        <p className="text-lg text-gray-600">Escolha o plano perfeito para impulsionar suas vendas de energia solar.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {MOCK_PLANS.map(plan => (
          <div key={plan.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow duration-300 flex flex-col">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-b from-blue-50 to-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-blue-600">R$ {plan.price.toFixed(2)}</span>
                <span className="text-gray-500 font-medium">/mês</span>
              </div>
            </div>
            <div className="p-8 flex-grow">
              <ul className="space-y-4 mb-8">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <PaymentWrapper planId={plan.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
