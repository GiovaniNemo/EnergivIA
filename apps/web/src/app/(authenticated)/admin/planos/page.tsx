"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  CreditCard,
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Percent,
  Calendar,
  Copy,
  Check,
  TrendingUp,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  Sliders,
  DollarSign,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  interval?: string;
  features?: string | string[] | null;
  active?: boolean;
  stripeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    subscriptions?: number;
  };
}

interface Coupon {
  id: string;
  code: string;
  couponId: string;
  name?: string;
  discountType: "percent" | "amount";
  discountValue: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
  timesRedeemed?: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

const PREDEFINED_BENEFITS = [
  "Até 50 propostas/mês",
  "Propostas comerciais ilimitadas",
  "Dimensionamento solar por IA",
  "OCR avançado de faturas de energia",
  "Assistente WhatsApp IA integrado",
  "CRM Solar Completo",
  "Geração de PDF com logotipo próprio",
  "Suporte prioritário via WhatsApp",
  "Múltiplos usuários por equipe",
  "Histórico financeiro & comissões",
];

export default function AdminPlanosPage() {
  const [activeTab, setActiveTab] = useState<"planos" | "cupons">("planos");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    interval: "month",
    features: [] as string[],
    newFeatureInput: "",
    active: true,
  });
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Coupon Modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    name: "",
    discountType: "percent" as "percent" | "amount",
    discountValue: "",
    duration: "once" as "once" | "repeating" | "forever",
    durationInMonths: "3",
    maxRedemptions: "",
    expiresAt: "",
  });
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copiado: ${text}`, "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch plans (including inactive)
      const plansRes = await fetch("/api/proxy/plans?includeInactive=true");
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(Array.isArray(plansData) ? plansData : []);
      }

      // 2. Fetch coupons
      const couponsRes = await fetch("/api/proxy/stripe/coupons");
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(Array.isArray(couponsData) ? couponsData : []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados", error);
      showToast("Erro ao carregar dados do servidor", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PLAN HANDLERS ---

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      description: "",
      price: "",
      interval: "month",
      features: ["Propostas ilimitadas", "Suporte WhatsApp", "CRM Solar Integrado"],
      newFeatureInput: "",
      active: true,
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    let parsedFeatures: string[] = [];
    if (plan.features) {
      if (Array.isArray(plan.features)) {
        parsedFeatures = plan.features;
      } else if (typeof plan.features === "string") {
        try {
          const arr = JSON.parse(plan.features);
          if (Array.isArray(arr)) parsedFeatures = arr;
          else parsedFeatures = plan.features.split(",").map((s) => s.trim());
        } catch {
          parsedFeatures = plan.features.split(",").map((s) => s.trim());
        }
      }
    }

    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      price: String(plan.price),
      interval: plan.interval || "month",
      features: parsedFeatures.filter(Boolean),
      newFeatureInput: "",
      active: plan.active !== false,
    });
    setIsPlanModalOpen(true);
  };

  const handleAddFeature = (feat: string) => {
    if (!feat.trim()) return;
    if (!planForm.features.includes(feat.trim())) {
      setPlanForm({
        ...planForm,
        features: [...planForm.features, feat.trim()],
        newFeatureInput: "",
      });
    } else {
      setPlanForm({ ...planForm, newFeatureInput: "" });
    }
  };

  const handleRemoveFeature = (index: number) => {
    setPlanForm({
      ...planForm,
      features: planForm.features.filter((_, i) => i !== index),
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim() || !planForm.price) {
      showToast("Preencha o nome e preço do plano", "error");
      return;
    }

    setPlanSubmitting(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        price: Number(planForm.price),
        interval: planForm.interval,
        features: planForm.features,
        active: planForm.active,
      };

      if (editingPlan) {
        // Update existing plan
        const res = await fetch(`/api/proxy/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Erro ao atualizar plano");
        }

        showToast("Plano atualizado com sucesso e sincronizado no Stripe!");
      } else {
        // Create new plan
        const res = await fetch("/api/proxy/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Erro ao criar plano");
        }

        showToast("Novo plano criado e integrado ao Stripe com sucesso!");
      }

      setIsPlanModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na operação";
      showToast(msg, "error");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleTogglePlanActive = async (plan: Plan) => {
    try {
      const newActive = !plan.active;
      const res = await fetch(`/api/proxy/plans/${plan.id}/toggle-active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });

      if (!res.ok) throw new Error("Erro ao alternar status do plano");

      showToast(`Plano ${plan.name} ${newActive ? "ativado" : "desativado"} com sucesso!`);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Erro ao alterar status do plano", "error");
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    const hasSubscribers = (plan._count?.subscriptions || 0) > 0;
    const confirmMsg = hasSubscribers
      ? `Atenção: O plano "${plan.name}" possui ${plan._count?.subscriptions} assinaturas vinculadas. Ele será desativado/arquivado para manter a integridade dos contratos. Deseja continuar?`
      : `Deseja realmente excluir o plano "${plan.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/proxy/plans/${plan.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao excluir o plano");
      }

      const result = await res.json().catch(() => ({}));
      showToast(result.message || `Plano "${plan.name}" excluído com sucesso!`);
      if (editingPlan?.id === plan.id) {
        setIsPlanModalOpen(false);
        setEditingPlan(null);
      }
      fetchData();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao excluir o plano";
      showToast(msg, "error");
    }
  };

  // --- COUPON HANDLERS ---

  const handleOpenCreateCoupon = () => {
    setCouponForm({
      code: "",
      name: "",
      discountType: "percent",
      discountValue: "20",
      duration: "once",
      durationInMonths: "3",
      maxRedemptions: "",
      expiresAt: "",
    });
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim() || !couponForm.discountValue) {
      showToast("Preencha o código e o valor do desconto", "error");
      return;
    }

    setCouponSubmitting(true);
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        name: couponForm.name.trim() || undefined,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        duration: couponForm.duration,
        durationInMonths:
          couponForm.duration === "repeating" && couponForm.durationInMonths
            ? Number(couponForm.durationInMonths)
            : undefined,
        maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : undefined,
        expiresAt: couponForm.expiresAt || undefined,
      };

      const res = await fetch("/api/proxy/stripe/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao criar cupom no Stripe");
      }

      showToast(`Cupom ${payload.code} criado e sincronizado com o Stripe!`);
      setIsCouponModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar cupom";
      showToast(msg, "error");
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Deseja realmente desativar o cupom ${code}?`)) return;

    try {
      const res = await fetch(`/api/proxy/stripe/coupons/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao desativar cupom");

      showToast(`Cupom ${code} desativado com sucesso!`);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Erro ao desativar cupom", "error");
    }
  };

  if (loading) {
    return (
      <LoadingState
        label="Carregando Painel Administrativo..."
        description="Buscando planos, assinaturas e cupons Stripe"
      />
    );
  }

  const activePlansCount = plans.filter((p) => p.active !== false).length;
  const activeCouponsCount = coupons.filter((c) => c.active).length;
  const totalSubscribers = plans.reduce((acc, curr) => acc + (curr._count?.subscriptions || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-500">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border flex items-center gap-3 shadow-2xl animate-in slide-in-from-top duration-300 max-w-md ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toast.type === "error"
                ? "bg-red-950/90 border-red-500/50 text-red-200"
                : "bg-blue-950/90 border-blue-500/50 text-blue-200"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto opacity-70 hover:opacity-100 transition p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-2 border border-[var(--color-primary)]/20">
            <Sliders className="w-3.5 h-3.5" />
            Painel de Administração
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-foreground)] tracking-tight">
            Planos & Cupons de Desconto
          </h1>
          <p className="text-sm md:text-base text-[var(--color-muted-foreground)] mt-1">
            Configure preços, benefícios, sincronização com o Stripe e crie cupons para a 1ª
            parcela.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition shadow-sm"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === "planos" ? (
            <button
              onClick={handleOpenCreatePlan}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          ) : (
            <button
              onClick={handleOpenCreateCoupon}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Novo Cupom de Desconto
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Planos Ativos
            </span>
            <p className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1">
              {activePlansCount}{" "}
              <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                / {plans.length}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Cupons Ativos
            </span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{activeCouponsCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Assinaturas Ativas
            </span>
            <p className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1">
              {totalSubscribers}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Gateway Pagamentos
            </span>
            <p className="text-base font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" /> Stripe Integrado
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-fit mb-8">
        <button
          onClick={() => setActiveTab("planos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === "planos"
              ? "bg-[var(--color-primary)] text-white shadow-md"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          Planos de Assinatura ({plans.length})
        </button>

        <button
          onClick={() => setActiveTab("cupons")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === "cupons"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/50"
          }`}
        >
          <Tag className="w-4 h-4" />
          Cupons de Desconto & 1ª Parcela ({coupons.length})
        </button>
      </div>

      {/* TAB 1: PLANOS */}
      {activeTab === "planos" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-foreground)]">
                  Planos Cadastrados
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Planos visíveis na tela de contratação e checkout dos clientes
                </p>
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="p-12 text-center">
                <Sparkles className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3 opacity-60" />
                <p className="text-lg font-bold text-[var(--color-foreground)]">
                  Nenhum plano cadastrado
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1 mb-4">
                  Clique no botão abaixo para adicionar o primeiro plano da sua plataforma.
                </p>
                <button
                  onClick={handleOpenCreatePlan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Criar Primeiro Plano
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-muted)]/30 border-b border-[var(--color-border)] text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                      <th className="px-6 py-4">Nome do Plano</th>
                      <th className="px-6 py-4">Valor Mensal</th>
                      <th className="px-6 py-4">Benefícios Inclusos</th>
                      <th className="px-6 py-4">Stripe Price ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {plans.map((plan) => {
                      const priceNum =
                        typeof plan.price === "number"
                          ? plan.price
                          : parseFloat(String(plan.price) || "0");
                      const rawFeats = plan.features;
                      const featuresList: string[] = Array.isArray(rawFeats)
                        ? rawFeats
                        : typeof rawFeats === "string"
                          ? rawFeats
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          : [];

                      return (
                        <tr
                          key={plan.id}
                          className="hover:bg-[var(--color-muted)]/20 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center font-bold text-sm">
                                {plan.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-[var(--color-foreground)] text-base">
                                  {plan.name}
                                </span>
                                {plan.description && (
                                  <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-1 max-w-xs">
                                    {plan.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-baseline gap-1">
                              <span className="font-extrabold text-lg text-[var(--color-foreground)]">
                                R$ {priceNum.toFixed(2)}
                              </span>
                              <span className="text-xs text-[var(--color-muted-foreground)]">
                                /{plan.interval === "year" ? "ano" : "mês"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {featuresList.length > 0 ? (
                                featuresList.map((feat, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] text-xs"
                                  >
                                    {feat}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                  Sem benefícios detalhados
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {plan.stripeId ? (
                              <button
                                onClick={() => copyToClipboard(plan.stripeId!, plan.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-xs font-mono text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition border border-[var(--color-border)]"
                                title="Copiar ID do Preço Stripe"
                              >
                                {copiedId === plan.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                {plan.stripeId.slice(0, 14)}...
                              </button>
                            ) : (
                              <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Não vinculado
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                plan.active !== false
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  plan.active !== false
                                    ? "bg-emerald-400 animate-pulse"
                                    : "bg-rose-400"
                                }`}
                              />
                              {plan.active !== false ? "Ativo" : "Inativo"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditPlan(plan)}
                                className="p-2 rounded-xl bg-[var(--color-muted)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-foreground)] transition border border-[var(--color-border)] shadow-sm"
                                title="Editar Plano"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleTogglePlanActive(plan)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                                  plan.active !== false
                                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                }`}
                                title={plan.active !== false ? "Desativar Plano" : "Ativar Plano"}
                              >
                                {plan.active !== false ? "Desativar" : "Ativar"}
                              </button>

                              <button
                                onClick={() => handleDeletePlan(plan)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 transition border border-rose-500/20 shadow-sm"
                                title="Excluir Plano"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CUPONS */}
      {activeTab === "cupons" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  Cupons Promocionais & Desconto na 1ª Parcela
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Cupons criados são automaticamente registrados no Stripe e podem ser inseridos
                  pelos clientes no checkout
                </p>
              </div>

              <button
                onClick={handleOpenCreateCoupon}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Cupom
              </button>
            </div>

            {coupons.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
                <p className="text-lg font-bold text-[var(--color-foreground)]">
                  Nenhum cupom cadastrado
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1 mb-4">
                  Crie cupons com desconto em porcentagem (%) ou valor fixo para a primeira
                  mensalidade dos clientes.
                </p>
                <button
                  onClick={handleOpenCreateCoupon}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Criar Cupom para 1ª Parcela
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-muted)]/30 border-b border-[var(--color-border)] text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                      <th className="px-6 py-4">Código do Cupom</th>
                      <th className="px-6 py-4">Desconto</th>
                      <th className="px-6 py-4">Aplicação / Duração</th>
                      <th className="px-6 py-4">Usos / Limite</th>
                      <th className="px-6 py-4">Validade</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {coupons.map((coupon) => (
                      <tr
                        key={coupon.id}
                        className="hover:bg-[var(--color-muted)]/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-base px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(coupon.code, coupon.id)}
                              className="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
                              title="Copiar Código"
                            >
                              {copiedId === coupon.id ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {coupon.name && (
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                              {coupon.name}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-muted)] border border-[var(--color-border)] font-extrabold text-sm text-[var(--color-foreground)]">
                            {coupon.discountType === "percent" ? (
                              <>
                                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                                {coupon.discountValue}% OFF
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                R$ {coupon.discountValue.toFixed(2)} OFF
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {coupon.duration === "once" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                              <Sparkles className="w-3 h-3" /> Apenas 1ª Parcela
                            </span>
                          ) : coupon.duration === "repeating" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                              <Clock className="w-3 h-3" /> {coupon.durationInMonths} Meses
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                              <ShieldCheck className="w-3 h-3" /> Vitalício
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-[var(--color-foreground)]">
                          <span className="font-semibold">{coupon.timesRedeemed ?? 0}</span>
                          {coupon.maxRedemptions ? (
                            <span className="text-[var(--color-muted-foreground)]">
                              {" "}
                              / {coupon.maxRedemptions}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              {" "}
                              (Ilimitado)
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-[var(--color-muted-foreground)]">
                          {coupon.expiresAt ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}
                            </div>
                          ) : (
                            <span className="text-xs">Sem expiração</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              coupon.active
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                coupon.active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                              }`}
                            />
                            {coupon.active ? "Ativo" : "Desativado"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {coupon.active && (
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition shadow-sm"
                              title="Desativar Cupom"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAN MODAL (CREATE & EDIT) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
                  <Layers className="w-6 h-6 text-[var(--color-primary)]" />
                  {editingPlan ? `Editar Plano: ${editingPlan.name}` : "Criar Novo Plano"}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Os valores e nomes são automaticamente sincronizados com o catálogo Stripe
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Básico, Profissional, Elite Solar"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Preço Mensal (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-sm font-bold text-[var(--color-muted-foreground)]">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="99.90"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl pl-10 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                  Descrição Curta (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ideal para integradores que estão começando"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                />
              </div>

              {/* BENEFITS TAGS BUILDER */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                  Benefícios & Funcionalidades Inclusas
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite um benefício e clique em Adicionar"
                    value={planForm.newFeatureInput}
                    onChange={(e) => setPlanForm({ ...planForm, newFeatureInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature(planForm.newFeatureInput);
                      }
                    }}
                    className="flex-1 bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFeature(planForm.newFeatureInput)}
                    className="px-4 py-3 rounded-xl bg-[var(--color-muted)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-foreground)] font-bold text-sm transition"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Selected Benefits Tags */}
                <div className="flex flex-wrap gap-2 p-3 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)] min-h-[60px] items-center">
                  {planForm.features.length === 0 ? (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Nenhum benefício adicionado. Adicione acima ou selecione as sugestões rápidas
                      abaixo.
                    </span>
                  ) : (
                    planForm.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] text-xs font-medium shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {feat}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="hover:text-red-400 transition ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick suggestions */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                    Sugestões rápidas (clique para incluir):
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {PREDEFINED_BENEFITS.filter((b) => !planForm.features.includes(b)).map(
                      (sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddFeature(sug)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] transition"
                        >
                          + {sug}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIVE SWITCH */}
              <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)]">
                <div>
                  <span className="text-sm font-bold text-[var(--color-foreground)]">
                    Status do Plano
                  </span>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Planos inativos não aparecem para novas assinaturas
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.active}
                    onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                {editingPlan && (
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(editingPlan)}
                    className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-bold text-sm transition flex items-center gap-2"
                    title="Excluir este plano"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={planSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {planSubmitting ? "Sincronizando com Stripe..." : "Salvar & Atualizar Plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUPON MODAL (CREATE) */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
                  <Tag className="w-6 h-6 text-emerald-400" />
                  Criar Cupom de Desconto
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Gere cupons para campanhas de aquisição ou desconto exclusivo na 1ª mensalidade
                </p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                  Código Promocional (O que o cliente digita) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PRIMEIRAPARCELA20, SOLAR30, BEMVINDO"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      code: e.target.value.toUpperCase().replace(/\s/g, ""),
                    })
                  }
                  className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] font-mono font-bold tracking-wider border border-[var(--color-border)] rounded-xl p-3 text-base focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                  Nome / Identificador Interno
                </label>
                <input
                  type="text"
                  placeholder="Ex: Desconto Especial de Boas-Vindas"
                  value={couponForm.name}
                  onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                  className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Tipo de Desconto *
                  </label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discountType: e.target.value as "percent" | "amount",
                      })
                    }
                    className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  >
                    <option value="percent">Porcentagem (%)</option>
                    <option value="amount">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Valor do Desconto *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder={couponForm.discountType === "percent" ? "20" : "50.00"}
                      value={couponForm.discountValue}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, discountValue: e.target.value })
                      }
                      className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition pr-10"
                    />
                    <span className="absolute right-3 top-3 text-sm font-bold text-[var(--color-muted-foreground)]">
                      {couponForm.discountType === "percent" ? "%" : "R$"}
                    </span>
                  </div>
                </div>
              </div>

              {/* DURATION SELECTOR */}
              <div className="p-4 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] space-y-3">
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                  Duração do Desconto (Aplicabilidade) *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, duration: "once" })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      couponForm.duration === "once"
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-2 ring-amber-500/20"
                        : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    <span className="font-bold text-xs">Apenas 1ª Parcela</span>
                    <span className="text-[10px] opacity-75 mt-1">Cobrança inicial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, duration: "repeating" })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      couponForm.duration === "repeating"
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-300 ring-2 ring-blue-500/20"
                        : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    <span className="font-bold text-xs">Por X Meses</span>
                    <span className="text-[10px] opacity-75 mt-1">Recorrente temp.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, duration: "forever" })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      couponForm.duration === "forever"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-300 ring-2 ring-purple-500/20"
                        : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    <span className="font-bold text-xs">Vitalício</span>
                    <span className="text-[10px] opacity-75 mt-1">Todas as faturas</span>
                  </button>
                </div>

                {couponForm.duration === "repeating" && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1">
                      Quantidade de meses com desconto:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={couponForm.durationInMonths}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, durationInMonths: e.target.value })
                      }
                      className="w-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-sm font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Limite de Resgates (Opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 50 clientes"
                    value={couponForm.maxRedemptions}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, maxRedemptions: e.target.value })
                    }
                    className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                    Data de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                    className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {couponSubmitting ? "Criando no Stripe..." : "Salvar & Ativar Cupom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
