"use client";

import React, { useState, useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string;
  active?: boolean;
}

export default function AdminPlanosPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({ name: "", price: "", features: "" });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/proxy/plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Erro ao buscar planos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/proxy/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `plan_${Date.now()}`,
          name: form.name,
          price: Number(form.price),
        }),
      });
      if (response.ok) {
        const newPlan = await response.json();
        setPlans([...plans, newPlan]);
        setForm({ name: "", price: "", features: "" });
      }
    } catch (error) {
      console.error("Erro ao salvar plano", error);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await fetch(`/api/proxy/plans/${id}`, { method: "DELETE" });
      setPlans(plans.map((p) => (p.id === id ? { ...p, active: false } : p)));
    } catch (error) {
      console.error("Erro ao desativar plano", error);
    }
  };

  if (loading) {
    return (
      <LoadingState label="Carregando configurações..." description="Buscando os planos atuais" />
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          Configuração de Planos (ADMIN)
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-2">
          Crie e edite os planos que aparecerão para os usuários.
        </p>
      </div>

      <div className="bg-[var(--color-card)] p-6 rounded-xl shadow-md border border-[var(--color-border)] mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-foreground)]">
          Adicionar Novo Plano
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                Nome do Plano
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] rounded-lg shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                Preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] rounded-lg shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 border"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              Benefícios (Separados por vírgula)
            </label>
            <textarea
              required
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] rounded-lg shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-2 border h-24"
            />
          </div>
          <button
            type="submit"
            className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
          >
            Salvar Plano
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-foreground)]">Planos Ativos</h2>
        <div className="bg-[var(--color-card)] rounded-xl shadow-md border border-[var(--color-border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-muted)]/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Benefícios
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[var(--color-muted)]/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
                    {plan.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-muted-foreground)]">
                    R$ {Number(plan.price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-muted-foreground)]">
                    {plan.features || "---"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeactivate(plan.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      Desativar
                    </button>
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
