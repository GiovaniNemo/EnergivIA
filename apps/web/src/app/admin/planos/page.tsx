'use client';

import React, { useState } from 'react';

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState([
    { id: '1', name: 'Básico', price: 99.90, features: 'Até 50 propostas' }
  ]);
  const [form, setForm] = useState({ name: '', price: '', features: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui chamaria a API para criar/salvar: fetch('/api/plans', { method: 'POST' })
    setPlans([...plans, { id: Date.now().toString(), name: form.name, price: Number(form.price), features: form.features }]);
    setForm({ name: '', price: '', features: '' });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuração de Planos (ADMIN)</h1>
        <p className="text-gray-600 mt-2">Crie e edite os planos que aparecerão para os usuários.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold mb-4">Adicionar Novo Plano</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefícios (Separados por vírgula)</label>
            <textarea 
              required
              value={form.features}
              onChange={e => setForm({...form, features: e.target.value})}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border h-24" 
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
            Salvar Plano
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Planos Ativos</h2>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benefícios</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map(plan => (
                <tr key={plan.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {plan.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{plan.features}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-red-600 hover:text-red-900">Desativar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
