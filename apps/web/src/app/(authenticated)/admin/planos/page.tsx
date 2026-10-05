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
  XCircle,
  AlertTriangle,
  Info,
  Boxes,
  Layers,
  Percent,
  Calendar,
  Copy,
  Check,
  TrendingUp,
  X,
  RefreshCw,
  RotateCcw,
  Clock,
  ShieldCheck,
  Sliders,
  DollarSign,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pencil,
} from "lucide-react";

import {
  type PlanFeaturesConfig,
  type PlanFeatureItem,
  normalizePlanFeatures,
  normalizeFeatureItem,
} from "@energivia/shared-types";
import { useOrganization } from "@/components/providers/organization-provider";

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  interval?: string;
  features?: string | string[] | Record<string, unknown> | null;
  featuresConfig?: PlanFeaturesConfig;
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
  isLifetimeAdmin?: boolean;
  targetPlan?: "all" | "plus" | "specific";
  isPlusOnly?: boolean;
  applicablePlanIds?: string[];
  applicablePlanNames?: string[];
  allowedPlanNamesDescription?: string;
}

const PREDEFINED_BENEFITS: PlanFeatureItem[] = [
  { text: "Até 50 propostas comerciais com IA por mês", included: true },
  { text: "Até 120 propostas comerciais com IA por mês", included: true },
  { text: "Propostas comerciais com IA ilimitadas", included: true },
  { text: "2 Usuários na equipe (1 convidado)", included: true },
  { text: "Até 5 usuários na equipe", included: true },
  { text: "Usuários e vendedores ilimitados na equipe", included: true },
  { text: "1 Número de WhatsApp com atendimento IA", included: true },
  { text: "Até 2 números de WhatsApp com IA 24/7", included: true },
  { text: "Até 5 números de WhatsApp com IA", included: true },
  { text: "1 Template de proposta personalizado", included: true },
  { text: "Criação de templates personalizados ilimitados", included: true },
  { text: "CRM Solar e funil de vendas", included: true },
  { text: "CRM Solar com histórico e follow-up", included: true },
  { text: "Radar Solar ANEEL Integrado na sua região", included: true },
  { text: "Radar Solar ANEEL Nacional Ilimitado", included: true },
  { text: "Alertas em tempo real quando o cliente abre a proposta", included: true },
];

export default function AdminPlanosPage() {
  const [activeTab, setActiveTab] = useState<"planos" | "cupons">("planos");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { currentOrganization, refetch: refetchOrg } = useOrganization();
  const [adminRedeemLoading, setAdminRedeemLoading] = useState(false);
  const [adminCouponInput, setAdminCouponInput] = useState("V1T4L1C10");
  const [currentOrgSubscription, setCurrentOrgSubscription] = useState<{
    id?: string;
    status?: string;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: string | null;
    planId?: string | null;
  } | null>(null);

  // Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    interval: "month",
    features: [] as PlanFeatureItem[],
    newFeatureInput: "",
    newFeatureIncluded: true,
    active: true,
    // Limites quantitativos
    maxProposalsPerMonth: "50",
    maxTeamMembers: "2",
    maxCustomTemplates: "1",
    maxWhatsappNumbers: "1",
    // Flags booleanas
    hasProposalViewAlerts: false,
    hasWhatsappBot: true,
    hasRadarSolar: false,
    hasCustomBranding: false,
  });
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Drag & drop and Inline Edit state for features in Plan Modal
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editingFeatureText, setEditingFeatureText] = useState("");
  const [draggedFeatureIndex, setDraggedFeatureIndex] = useState<number | null>(null);
  const [dragOverFeatureIndex, setDragOverFeatureIndex] = useState<number | null>(null);

  // Coupon Modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: "",
    name: "",
    discountType: "percent" as "percent" | "amount",
    discountValue: "",
    duration: "once" as "once" | "repeating" | "forever",
    durationInMonths: "3",
    maxRedemptions: "",
    expiresAt: "",
    targetPlan: "all" as "all" | "plus" | "specific",
    applicablePlanIds: [] as string[],
  });
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponModalError, setCouponModalError] = useState<string | null>(null);

  // Stripe status & sync state
  const [stripeStatus, setStripeStatus] = useState<{
    configured: boolean;
    mode: "live" | "test" | "unconfigured";
    isLive: boolean;
    hasWebhook: boolean;
  } | null>(null);
  const [syncingStripe, setSyncingStripe] = useState(false);

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

      // 3. Fetch Stripe Status
      try {
        const statusRes = await fetch("/api/proxy/stripe/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStripeStatus(statusData);
        }
      } catch (err) {
        console.warn("Não foi possível obter status do Stripe", err);
      }

      // 4. Fetch Current Organization's Subscription
      if (currentOrganization?.id) {
        try {
          const subRes = await fetch(`/api/proxy/stripe/subscription/${currentOrganization.id}`);
          if (subRes.ok) {
            const subData = await subRes.json();
            setCurrentOrgSubscription(subData && subData.status !== "canceled" ? subData : null);
          } else {
            setCurrentOrgSubscription(null);
          }
        } catch (err) {
          console.warn("Não foi possível obter assinatura da organização", err);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados", error);
      showToast("Erro ao carregar dados do servidor", "error");
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  const isCurrentOrgLifetime = Boolean(
    currentOrgSubscription?.stripeSubscriptionId === "sub_lifetime_admin_v1t4l1c10" ||
    (currentOrgSubscription?.currentPeriodEnd &&
      new Date(currentOrgSubscription.currentPeriodEnd).getFullYear() >= 2090)
  );

  const handleSyncWithStripe = async () => {
    setSyncingStripe(true);
    try {
      const res = await fetch("/api/proxy/plans/sync-stripe", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Falha ao sincronizar planos com o Stripe");
      }
      const data = await res.json();
      const modeText = stripeStatus?.isLive ? "PRODUÇÃO (Real)" : "TESTE";
      showToast(
        `Sucesso! ${data.total ?? (data.plans?.length || 0)} planos sincronizados com o Stripe em modo ${modeText}!`,
        "success"
      );
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao sincronizar";
      showToast(msg, "error");
    } finally {
      setSyncingStripe(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PLAN HANDLERS ---

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setEditingFeatureIndex(null);
    setEditingFeatureText("");
    setDraggedFeatureIndex(null);
    setDragOverFeatureIndex(null);
    setPlanForm({
      name: "",
      description: "",
      price: "",
      interval: "month",
      features: [
        { text: "Até 50 propostas comerciais com IA por mês", included: true },
        { text: "2 Usuários na equipe (1 convidado)", included: true },
        { text: "1 Número de WhatsApp com atendimento IA", included: true },
        { text: "1 Template de proposta personalizado", included: true },
        { text: "CRM Solar e funil de vendas", included: true },
        { text: "Radar Solar ANEEL (Prospecção ativa na sua região)", included: false },
        { text: "Alertas quando o cliente abre a proposta", included: false },
      ],
      newFeatureInput: "",
      newFeatureIncluded: true,
      active: true,
      maxProposalsPerMonth: "50",
      maxTeamMembers: "2",
      maxCustomTemplates: "1",
      maxWhatsappNumbers: "1",
      hasProposalViewAlerts: false,
      hasWhatsappBot: true,
      hasRadarSolar: false,
      hasCustomBranding: false,
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditingFeatureIndex(null);
    setEditingFeatureText("");
    setDraggedFeatureIndex(null);
    setDragOverFeatureIndex(null);
    const config = plan.featuresConfig || normalizePlanFeatures(plan.features, plan.name);
    const parsedFeatures: PlanFeatureItem[] = (
      config.featureItems ||
      config.bulletPoints ||
      []
    ).map(normalizeFeatureItem);

    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      price: String(plan.price),
      interval: plan.interval || "month",
      features: parsedFeatures,
      newFeatureInput: "",
      newFeatureIncluded: true,
      active: plan.active !== false,
      maxProposalsPerMonth:
        config.maxProposalsPerMonth !== null && config.maxProposalsPerMonth !== undefined
          ? String(config.maxProposalsPerMonth)
          : "",
      maxTeamMembers:
        config.maxTeamMembers !== null && config.maxTeamMembers !== undefined
          ? String(config.maxTeamMembers)
          : "",
      maxCustomTemplates:
        config.maxCustomTemplates !== null && config.maxCustomTemplates !== undefined
          ? String(config.maxCustomTemplates)
          : "",
      maxWhatsappNumbers:
        config.maxWhatsappNumbers !== null && config.maxWhatsappNumbers !== undefined
          ? String(config.maxWhatsappNumbers)
          : "",
      hasProposalViewAlerts: Boolean(config.hasProposalViewAlerts),
      hasWhatsappBot: Boolean(config.hasWhatsappBot),
      hasRadarSolar: Boolean(config.hasRadarSolar),
      hasCustomBranding: Boolean(config.hasCustomBranding),
    });
    setIsPlanModalOpen(true);
  };

  const handleAddFeature = (text: string, included = true) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const exists = planForm.features.some((f) => f.text.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setPlanForm((prev) => ({
        ...prev,
        features: [...prev.features, { text: trimmed, included }],
        newFeatureInput: "",
      }));
    } else {
      setPlanForm((prev) => ({ ...prev, newFeatureInput: "" }));
    }
  };

  const handleToggleFeatureIncluded = (index: number) => {
    setPlanForm((prev) => {
      const updated = [...prev.features];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          included: !updated[index].included,
        };
      }
      return { ...prev, features: updated };
    });
  };

  const handleRemoveFeature = (index: number) => {
    if (editingFeatureIndex === index) {
      setEditingFeatureIndex(null);
      setEditingFeatureText("");
    }
    setPlanForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleStartEditFeature = (index: number) => {
    setEditingFeatureIndex(index);
    setEditingFeatureText(planForm.features[index]?.text || "");
  };

  const handleSaveEditFeature = (index: number) => {
    const trimmed = editingFeatureText.trim();
    if (!trimmed) {
      handleRemoveFeature(index);
      return;
    }
    setPlanForm((prev) => {
      const updated = [...prev.features];
      if (updated[index]) {
        updated[index] = { ...updated[index], text: trimmed };
      }
      return { ...prev, features: updated };
    });
    setEditingFeatureIndex(null);
    setEditingFeatureText("");
  };

  const handleCancelEditFeature = () => {
    setEditingFeatureIndex(null);
    setEditingFeatureText("");
  };

  const handleMoveFeature = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= planForm.features.length ||
      toIndex < 0 ||
      toIndex >= planForm.features.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    setPlanForm((prev) => {
      const updated = [...prev.features];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...prev, features: updated };
    });

    if (editingFeatureIndex === fromIndex) {
      setEditingFeatureIndex(toIndex);
    } else if (editingFeatureIndex !== null) {
      if (fromIndex < editingFeatureIndex && toIndex >= editingFeatureIndex) {
        setEditingFeatureIndex(editingFeatureIndex - 1);
      } else if (fromIndex > editingFeatureIndex && toIndex <= editingFeatureIndex) {
        setEditingFeatureIndex(editingFeatureIndex + 1);
      }
    }
  };

  const handleResetToRecommendedFeatures = () => {
    const nameLower = (planForm.name || editingPlan?.name || "").toLowerCase();
    let templateDefaults: PlanFeatureItem[] = [];
    if (nameLower.includes("plus") || nameLower.includes("enterprise")) {
      templateDefaults = [
        { text: "Propostas comerciais com IA ilimitadas", included: true },
        { text: "Usuários e vendedores ilimitados na equipe", included: true },
        { text: "Até 5 números de WhatsApp com IA", included: true },
        { text: "Criação de templates personalizados ilimitados", included: true },
        { text: "CRM Solar completo com histórico e follow-up", included: true },
        { text: "Radar Solar ANEEL Nacional Ilimitado", included: true },
        { text: "Alertas instantâneos e rastreamento de abertura", included: true },
      ];
    } else if (nameLower.includes("pro") || nameLower.includes("profissional")) {
      templateDefaults = [
        { text: "Até 120 propostas comerciais com IA por mês", included: true },
        { text: "Até 5 usuários na equipe", included: true },
        { text: "Até 2 números de WhatsApp com IA 24/7", included: true },
        { text: "Criação de templates personalizados ilimitados", included: true },
        { text: "CRM Solar com histórico e follow-up", included: true },
        { text: "Radar Solar ANEEL Integrado na sua região", included: true },
        { text: "Alertas em tempo real quando o cliente abre a proposta", included: true },
      ];
    } else {
      templateDefaults = [
        { text: "Até 50 propostas comerciais com IA por mês", included: true },
        { text: "2 Usuários na equipe (1 convidado)", included: true },
        { text: "1 Número de WhatsApp com atendimento IA", included: true },
        { text: "1 Template de proposta personalizado", included: true },
        { text: "CRM Solar e funil de vendas", included: true },
        { text: "Radar Solar ANEEL (Prospecção ativa na sua região)", included: false },
        { text: "Alertas quando o cliente abre a proposta", included: false },
      ];
    }
    setPlanForm((prev) => ({ ...prev, features: templateDefaults }));
    showToast("Recursos recomendados aplicados ao formulário!");
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim() || !planForm.price) {
      showToast("Preencha o nome e preço do plano", "error");
      return;
    }

    setPlanSubmitting(true);
    try {
      // Garante que se o usuário estiver editando um item em linha ou digitou no input sem clicar em adicionar, o texto seja salvo
      let featuresToSave: PlanFeatureItem[] = [...planForm.features];
      if (editingFeatureIndex !== null && editingFeatureText.trim()) {
        featuresToSave[editingFeatureIndex] = {
          ...featuresToSave[editingFeatureIndex],
          text: editingFeatureText.trim(),
        };
      }
      if (
        planForm.newFeatureInput.trim() &&
        !featuresToSave.some(
          (f) => f.text.toLowerCase() === planForm.newFeatureInput.trim().toLowerCase()
        )
      ) {
        featuresToSave.push({
          text: planForm.newFeatureInput.trim(),
          included: planForm.newFeatureIncluded,
        });
      }

      const featuresConfig: PlanFeaturesConfig = {
        maxProposalsPerMonth:
          planForm.maxProposalsPerMonth.trim() === ""
            ? null
            : Number(planForm.maxProposalsPerMonth),
        maxTeamMembers:
          planForm.maxTeamMembers.trim() === "" ? null : Number(planForm.maxTeamMembers),
        maxCustomTemplates:
          planForm.maxCustomTemplates.trim() === "" ? null : Number(planForm.maxCustomTemplates),
        maxWhatsappNumbers:
          planForm.maxWhatsappNumbers.trim() === "" ? null : Number(planForm.maxWhatsappNumbers),
        hasProposalViewAlerts: planForm.hasProposalViewAlerts,
        hasWhatsappBot: planForm.hasWhatsappBot,
        hasRadarSolar: planForm.hasRadarSolar,
        hasCustomBranding: planForm.hasCustomBranding,
        bulletPoints: featuresToSave,
        featureItems: featuresToSave,
      };

      const payload = {
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        price: Number(planForm.price),
        interval: planForm.interval,
        features: featuresConfig,
        featuresConfig,
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
      ? `Atenção: O plano "${plan.name}" possui ${plan._count?.subscriptions} assinatura(s) vinculada(s) (testes ou contratos).\n\nDeseja realmente EXCLUIR DEFINITIVAMENTE este plano e remover os vínculos de assinatura?\n\n(Se quiser apenas ocultar para novos clientes mantendo o histórico, cancele e use o botão "Desativar").`
      : `Deseja realmente excluir definitivamente o plano "${plan.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/proxy/plans/${plan.id}?force=true`, {
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
    setEditingCoupon(null);
    const activePlanIds = plans.filter((p) => p.active !== false).map((p) => p.id);
    setCouponForm({
      code: "",
      name: "",
      discountType: "percent",
      discountValue: "20",
      duration: "once",
      durationInMonths: "3",
      maxRedemptions: "",
      expiresAt: "",
      targetPlan: "all",
      applicablePlanIds: activePlanIds.length > 0 ? activePlanIds : plans.map((p) => p.id),
    });
    setCouponModalError(null);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    let formattedExpires = "";
    if (coupon.expiresAt) {
      try {
        formattedExpires = new Date(coupon.expiresAt).toISOString().split("T")[0] || "";
      } catch {
        formattedExpires = "";
      }
    }

    let initialPlanIds: string[] = [];
    if (coupon.applicablePlanIds && coupon.applicablePlanIds.length > 0) {
      initialPlanIds = coupon.applicablePlanIds;
    } else if (coupon.isPlusOnly || coupon.targetPlan === "plus") {
      const plusPlan = plans.find((p) => p.name.toLowerCase().includes("plus"));
      initialPlanIds = plusPlan ? [plusPlan.id] : [];
    } else {
      initialPlanIds = plans.map((p) => p.id);
    }

    setCouponForm({
      code: coupon.code,
      name: coupon.name || "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      duration: coupon.duration,
      durationInMonths: coupon.durationInMonths ? String(coupon.durationInMonths) : "3",
      maxRedemptions: coupon.maxRedemptions ? String(coupon.maxRedemptions) : "",
      expiresAt: formattedExpires,
      targetPlan: coupon.targetPlan || (coupon.isPlusOnly ? "plus" : "all"),
      applicablePlanIds: initialPlanIds,
    });
    setCouponModalError(null);
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponModalError(null);
    if (!couponForm.code.trim() || !couponForm.discountValue) {
      setCouponModalError("Preencha o código e o valor do desconto");
      showToast("Preencha o código e o valor do desconto", "error");
      return;
    }

    if (couponForm.applicablePlanIds.length === 0) {
      setCouponModalError("Selecione pelo menos um plano permitido para este cupom.");
      showToast("Selecione pelo menos um plano permitido para este cupom.", "error");
      return;
    }

    if (couponForm.discountType === "amount") {
      const discountNum = Number(couponForm.discountValue);
      const invalidPlan = plans.find(
        (p) => couponForm.applicablePlanIds.includes(p.id) && Number(p.price) <= discountNum
      );
      if (invalidPlan) {
        const errorMsg = `O desconto de R$ ${discountNum.toFixed(2)} é maior ou igual à mensalidade do plano ${invalidPlan.name} (R$ ${Number(invalidPlan.price).toFixed(2)}). Desmarque este plano para evitar que a assinatura saia de graça.`;
        setCouponModalError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }
    }

    setCouponSubmitting(true);
    try {
      const isOnlyPlus =
        couponForm.applicablePlanIds.length === 1 &&
        Boolean(
          plans
            .find((p) => p.id === couponForm.applicablePlanIds[0])
            ?.name.toLowerCase()
            .includes("plus")
        );

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
        targetPlan: isOnlyPlus ? "plus" : "all",
        applicablePlanIds: couponForm.applicablePlanIds,
      };

      const isEditing = Boolean(editingCoupon);
      const url = isEditing
        ? `/api/proxy/stripe/coupons/${editingCoupon!.id}`
        : "/api/proxy/stripe/coupons";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message ||
            (isEditing ? "Erro ao atualizar cupom no Stripe" : "Erro ao criar cupom no Stripe")
        );
      }

      showToast(
        isEditing
          ? `Cupom ${payload.code} atualizado e sincronizado com o Stripe!`
          : `Cupom ${payload.code} criado e sincronizado com o Stripe!`
      );
      setEditingCoupon(null);
      setCouponModalError(null);
      setIsCouponModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cupom";
      setCouponModalError(msg);
      showToast(msg, "error");
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (code.toUpperCase() === "V1T4L1C10") {
      showToast("O cupom master de administradores não pode ser desativado.", "error");
      return;
    }

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

  const handleRedeemAdminCoupon = async (codeToRedeem = "V1T4L1C10") => {
    if (!currentOrganization?.id) {
      showToast("Organização ativa não encontrada.", "error");
      return;
    }

    setAdminRedeemLoading(true);
    try {
      const res = await fetch("/api/proxy/stripe/redeem-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToRedeem.trim().toUpperCase(),
          tenantId: currentOrganization.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao resgatar cupom de acesso");
      }

      showToast(
        data.message || `Cupom ${codeToRedeem} ativado com sucesso! Acesso vitalício liberado.`,
        "success"
      );
      await refetchOrg();
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao resgatar cupom";
      showToast(msg, "error");
    } finally {
      setAdminRedeemLoading(false);
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
          className={`fixed top-6 right-6 z-[9999] p-4 rounded-2xl border flex items-center gap-3 shadow-2xl animate-in slide-in-from-top duration-300 max-w-md ${
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
          {toast.type === "info" && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
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

          {activeTab === "planos" && (
            <button
              onClick={handleSyncWithStripe}
              disabled={syncingStripe}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold text-sm shadow-sm transition hover:scale-[1.02] disabled:opacity-50"
              title="Cria ou atualiza todos os planos no Stripe automaticamente (útil ao mudar para Produção)"
            >
              <RefreshCw
                className={`w-4 h-4 text-emerald-400 ${syncingStripe ? "animate-spin" : ""}`}
              />
              {syncingStripe ? "Sincronizando..." : "Sincronizar com Stripe"}
            </button>
          )}

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
            <div className="mt-1 flex items-center gap-1.5">
              {stripeStatus?.isLive ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Stripe Produção (Real)
                </span>
              ) : stripeStatus?.mode === "test" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Stripe Modo Teste
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Chaves Pendentes
                </span>
              )}
            </div>
            {stripeStatus?.hasWebhook && (
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Webhook Conectado
              </p>
            )}
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
                <Boxes className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3 opacity-60" />
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
                      const config =
                        plan.featuresConfig || normalizePlanFeatures(plan.features, plan.name);
                      const featuresList: PlanFeatureItem[] = (
                        config.featureItems ||
                        config.bulletPoints ||
                        []
                      ).map(normalizeFeatureItem);

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
                            <div className="flex flex-col">
                              {(() => {
                                const lower = (plan.name || "").toLowerCase();
                                let orig: number | null = null;
                                if (lower.includes("essencial") || Math.abs(priceNum - 99.99) < 1)
                                  orig = 169.99;
                                else if (lower.includes("plus") || Math.abs(priceNum - 399.99) < 1)
                                  orig = 699.99;
                                else if (lower.includes("pro") || Math.abs(priceNum - 199.99) < 1)
                                  orig = 299.99;

                                return (
                                  <>
                                    {orig && (
                                      <span className="text-xs line-through text-[var(--color-muted-foreground)]">
                                        De R$ {orig.toFixed(2).replace(".", ",")}
                                      </span>
                                    )}
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-extrabold text-lg text-[var(--color-foreground)]">
                                        R$ {priceNum.toFixed(2).replace(".", ",")}
                                      </span>
                                      <span className="text-xs text-[var(--color-muted-foreground)]">
                                        /{plan.interval === "year" ? "ano" : "mês"}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {featuresList.length > 0 ? (
                                featuresList.map((feat, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2.5 py-0.5 rounded-full border text-xs inline-flex items-center gap-1 ${
                                      feat.included
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-300 border-rose-500/20 opacity-75"
                                    }`}
                                  >
                                    {feat.included ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                    )}
                                    <span className="truncate max-w-[200px]">{feat.text}</span>
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
          {/* Quick Admin Coupon Activation Card */}
          <div className="bg-gradient-to-br from-emerald-950/30 via-[var(--color-card)] to-emerald-950/15 border border-emerald-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Cupom Master Admin
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Org Ativa:{" "}
                    <strong className="text-[var(--color-foreground)]">
                      {currentOrganization?.name || "Sua Organização"}
                    </strong>
                  </span>
                  {isCurrentOrgLifetime && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Vitalício Ativo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                  {isCurrentOrgLifetime
                    ? "Acesso Vitalício Total (Admin Master) já está Ativado!"
                    : "Ativação Vitalícia Direta (Sem Cartão Stripe)"}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  {isCurrentOrgLifetime ? (
                    <>
                      Sua organização <strong>{currentOrganization?.name || "atual"}</strong> já
                      possui o Plano Plus permanente liberado com todos os recursos (validade
                      vitalícia até 2099). O cupom master está devidamente vinculado.
                    </>
                  ) : (
                    <>
                      O cupom <strong>V1T4L1C10</strong> (ou <strong>VITALICIOADMINS</strong>) é
                      exclusivo para administradores. Ele concede acesso total ao Plano Plus com
                      validade permanente sem a necessidade de cadastrar cartão no Stripe.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={adminCouponInput}
                  onChange={(e) => setAdminCouponInput(e.target.value.toUpperCase())}
                  className="bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-emerald-500 outline-none w-full sm:w-44 text-center"
                />
                <button
                  type="button"
                  onClick={() => handleRedeemAdminCoupon(adminCouponInput)}
                  disabled={adminRedeemLoading || !adminCouponInput.trim()}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap ${
                    isCurrentOrgLifetime
                      ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                >
                  {adminRedeemLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isCurrentOrgLifetime ? "Revalidar / Ativo" : "Ativar na Minha Organização"}
                </button>
              </div>
            </div>
          </div>

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
                      <th className="px-6 py-4">Plano Permitido</th>
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
                            {(coupon.code.toUpperCase() === "V1T4L1C10" ||
                              coupon.isLifetimeAdmin) && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                                Admin Master
                              </span>
                            )}
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
                          {coupon.code.toUpperCase() === "V1T4L1C10" || coupon.isLifetimeAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                              <ShieldCheck className="w-3 h-3" /> Vitalício Total (Admin)
                            </span>
                          ) : coupon.duration === "once" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                              <Tag className="w-3 h-3" /> Apenas 1ª Parcela
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

                        <td className="px-6 py-4">
                          {coupon.applicablePlanNames && coupon.applicablePlanNames.length > 0 ? (
                            coupon.applicablePlanNames.length >=
                            (plans.filter((p) => p.active !== false).length || 3) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] text-xs font-medium">
                                Todos os Planos
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {coupon.applicablePlanNames.map((name) => {
                                  const isPlus = name.toLowerCase().includes("plus");
                                  const isPro = name.toLowerCase().includes("pro");
                                  return (
                                    <span
                                      key={name}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                        isPlus
                                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                          : isPro
                                            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                      }`}
                                    >
                                      {name}
                                    </span>
                                  );
                                })}
                              </div>
                            )
                          ) : coupon.isPlusOnly ||
                            coupon.targetPlan === "plus" ||
                            coupon.discountValue >= 100 ||
                            (coupon.duration === "repeating" &&
                              (coupon.durationInMonths === 2 || coupon.durationInMonths === 3)) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold">
                              Exclusivo PLUS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] text-xs">
                              Todos os Planos
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
                          <div className="flex items-center justify-end gap-2">
                            {!(
                              coupon.code.toUpperCase() === "V1T4L1C10" || coupon.isLifetimeAdmin
                            ) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditCoupon(coupon)}
                                className="p-2 rounded-xl bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] transition shadow-sm"
                                title="Editar Cupom"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {coupon.code.toUpperCase() === "V1T4L1C10" || coupon.isLifetimeAdmin ? (
                              isCurrentOrgLifetime ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold whitespace-nowrap shadow-sm"
                                  title="Este cupom já está ativado e operando na sua organização atual."
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Ativado nesta Org
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRedeemAdminCoupon(coupon.code)}
                                  disabled={adminRedeemLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                                  title="Ativar Plano Vitalício na Organização Ativa"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Ativar na Minha Org
                                </button>
                              )
                            ) : (
                              coupon.active && (
                                <button
                                  onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition shadow-sm"
                                  title="Desativar Cupom"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* STICKY HEADER */}
            <div className="px-6 py-4 md:py-5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card)] z-10">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
                  <Layers className="w-5 h-5 md:w-6 md:h-6 text-[var(--color-primary)]" />
                  {editingPlan ? `Editar Plano: ${editingPlan.name}` : "Criar Novo Plano"}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Os valores e nomes são automaticamente sincronizados com o catálogo Stripe
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-2 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <form
              id="plan-form"
              onSubmit={handleSavePlan}
              className="overflow-y-auto flex-1 p-5 md:p-6 space-y-5"
            >
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

              {/* RECURSOS E LIMITES QUANTITATIVOS */}
              <div className="p-4 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Regras & Limites do Plano
                    </span>
                    <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                      Deixe o campo vazio para tornar a funcionalidade <strong>ILIMITADA</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase mb-1">
                      Limite de Propostas / Mês
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ilimitado (vazio)"
                      value={planForm.maxProposalsPerMonth}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, maxProposalsPerMonth: e.target.value })
                      }
                      className="w-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                    />
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Ex: 50 para Essencial
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase mb-1">
                      Limite de Usuários na Equipe
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ilimitado (vazio)"
                      value={planForm.maxTeamMembers}
                      onChange={(e) => setPlanForm({ ...planForm, maxTeamMembers: e.target.value })}
                      className="w-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                    />
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Ex: 2 para Essencial, 5 para Pro
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase mb-1">
                      Templates Personalizados
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ilimitado (vazio)"
                      value={planForm.maxCustomTemplates}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, maxCustomTemplates: e.target.value })
                      }
                      className="w-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                    />
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Ex: 1 para Essencial
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase mb-1">
                      Números de WhatsApp Integrados
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ilimitado (vazio)"
                      value={planForm.maxWhatsappNumbers}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, maxWhatsappNumbers: e.target.value })
                      }
                      className="w-full bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                    />
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      Ex: 1 para Essencial, 3 para Pro
                    </span>
                  </div>
                </div>

                {/* TOGGLE SWITCHES DE MÓDULOS */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--color-border)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)]/40 transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-foreground)] block">
                        Alertas de Visualização de Proposta (Email & WhatsApp)
                      </span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        Notifica em tempo real quando o cliente abre o link da proposta (Pro / Plus)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={planForm.hasProposalViewAlerts}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, hasProposalViewAlerts: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)]/40 transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-foreground)] block">
                        Bot de WhatsApp IA
                      </span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        Assistente virtual com inteligência artificial para cotações no WhatsApp
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={planForm.hasWhatsappBot}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, hasWhatsappBot: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)]/40 transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-foreground)] block">
                        Radar Solar ANEEL Completo
                      </span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        Acesso à visualização tabular, contatos e conversão de usinas em leads
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={planForm.hasRadarSolar}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, hasRadarSolar: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)]/40 transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-foreground)] block">
                        Whitelabel & Logotipo Próprio
                      </span>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        Remoção de marcas da plataforma e personalização total da identidade visual
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={planForm.hasCustomBranding}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, hasCustomBranding: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800"
                    />
                  </label>
                </div>
              </div>

              {/* BENEFITS LIST BUILDER */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                      Recursos & Funcionalidades ({planForm.features.length})
                    </label>
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      Alterne entre Incluso (✓) e Não incluso (✕), arraste para ordenar ou edite o
                      texto
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToRecommendedFeatures}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[11px] font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] transition"
                    title="Preencher com os 7 recursos recomendados deste plano"
                  >
                    <RotateCcw className="w-3 h-3 text-[var(--color-primary)]" />
                    Padrão Recomendado
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPlanForm((prev) => ({
                        ...prev,
                        newFeatureIncluded: !prev.newFeatureIncluded,
                      }))
                    }
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border shrink-0 ${
                      planForm.newFeatureIncluded
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                    }`}
                    title="Clique para alternar o status do novo item"
                  >
                    {planForm.newFeatureIncluded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✓ Incluso</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>✕ Não incluso</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder="Digite um novo benefício e clique em Adicionar"
                    value={planForm.newFeatureInput}
                    onChange={(e) => setPlanForm({ ...planForm, newFeatureInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature(planForm.newFeatureInput, planForm.newFeatureIncluded);
                      }
                    }}
                    className="flex-1 bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddFeature(planForm.newFeatureInput, planForm.newFeatureIncluded)
                    }
                    className="px-4 py-2.5 rounded-xl bg-[var(--color-muted)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-foreground)] font-bold text-xs transition shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Reorderable & Editable Benefits List */}
                <div className="space-y-2 p-3 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] max-h-64 overflow-y-auto">
                  {planForm.features.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
                      Nenhum recurso adicionado. Adicione acima ou selecione as sugestões rápidas
                      abaixo.
                    </div>
                  ) : (
                    planForm.features.map((feat, idx) => {
                      const isEditing = editingFeatureIndex === idx;
                      const isDragging = draggedFeatureIndex === idx;
                      const isDragOver = dragOverFeatureIndex === idx;

                      return (
                        <div
                          key={idx}
                          draggable={!isEditing}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", String(idx));
                            setDraggedFeatureIndex(idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverFeatureIndex !== idx) {
                              setDragOverFeatureIndex(idx);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverFeatureIndex === idx) {
                              setDragOverFeatureIndex(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedFeatureIndex !== null && draggedFeatureIndex !== idx) {
                              handleMoveFeature(draggedFeatureIndex, idx);
                            }
                            setDraggedFeatureIndex(null);
                            setDragOverFeatureIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedFeatureIndex(null);
                            setDragOverFeatureIndex(null);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all duration-150 ${
                            isDragging
                              ? "opacity-40 border-dashed border-[var(--color-primary)] bg-[var(--color-card)]"
                              : isDragOver
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30 scale-[1.01]"
                                : isEditing
                                  ? "border-[var(--color-primary)] bg-[var(--color-card)] shadow-md"
                                  : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/30"
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            className={`p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] select-none shrink-0 ${
                              isEditing
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-grab active:cursor-grabbing"
                            }`}
                            title={isEditing ? "" : "Clique e arraste para reordenar"}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Index Badge */}
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-muted-foreground)] shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Toggle Included Badge Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFeatureIncluded(idx);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition border shrink-0 ${
                              feat.included
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            }`}
                            title="Clique para alternar entre Incluso (✓) e Não incluso (✕)"
                          >
                            {feat.included ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Incluso</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-400" />
                                <span>Não incluso</span>
                              </>
                            )}
                          </button>

                          {/* Item Content: View vs Edit */}
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <input
                                type="text"
                                autoFocus
                                value={editingFeatureText}
                                onChange={(e) => setEditingFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditFeature(idx);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    handleCancelEditFeature();
                                  }
                                }}
                                className="flex-1 bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-primary)] rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditFeature(idx)}
                                className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shrink-0"
                                title="Salvar alteração (Enter)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditFeature}
                                className="p-1 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[var(--color-foreground)] transition shrink-0"
                                title="Cancelar (Esc)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex-1 min-w-0 cursor-pointer py-1"
                              onClick={() => handleStartEditFeature(idx)}
                              title="Clique para editar o texto deste item"
                            >
                              <span
                                className={`text-xs font-medium truncate block ${
                                  feat.included
                                    ? "text-[var(--color-foreground)]"
                                    : "text-[var(--color-muted-foreground)] opacity-75 line-through decoration-rose-500/40"
                                }`}
                              >
                                {feat.text}
                              </span>
                            </div>
                          )}

                          {/* Action Buttons (when not editing) */}
                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveFeature(idx, idx - 1)}
                                className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                                title="Mover para cima"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={idx === planForm.features.length - 1}
                                onClick={() => handleMoveFeature(idx, idx + 1)}
                                className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                                title="Mover para baixo"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit text */}
                              <button
                                type="button"
                                onClick={() => handleStartEditFeature(idx)}
                                className="p-1.5 rounded-lg bg-[var(--color-muted)]/60 hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-muted-foreground)] transition"
                                title="Editar texto do item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(idx)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-[var(--color-muted-foreground)] transition"
                                title="Remover item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick suggestions */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                    Sugestões rápidas da plataforma (clique para incluir):
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-24 overflow-y-auto">
                    {PREDEFINED_BENEFITS.filter(
                      (b) =>
                        !planForm.features.some(
                          (f) => f.text.toLowerCase() === b.text.toLowerCase()
                        )
                    ).map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddFeature(sug.text, sug.included)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] transition"
                      >
                        + {sug.text}
                      </button>
                    ))}
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
            </form>

            {/* STICKY FOOTER */}
            <div className="p-4 md:px-6 md:py-4 border-t border-[var(--color-border)] bg-[var(--color-card)] shrink-0 flex items-center justify-end gap-3 z-10">
              {editingPlan && (
                <button
                  type="button"
                  onClick={() => handleDeletePlan(editingPlan)}
                  className="mr-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-bold text-sm transition flex items-center gap-2"
                  title="Excluir este plano"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-bold text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="plan-form"
                disabled={planSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {planSubmitting ? "Sincronizando..." : "Salvar & Atualizar Plano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COUPON MODAL (CREATE) */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* STICKY HEADER */}
            <div className="px-6 py-4 md:py-5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card)] z-10">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
                  <Tag className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                  {editingCoupon ? "Editar Cupom de Desconto" : "Criar Cupom de Desconto"}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  {editingCoupon
                    ? "Atualize as configurações e regras do cupom sincronizado no Stripe"
                    : "Gere cupons para campanhas de aquisição ou desconto exclusivo na 1ª mensalidade"}
                </p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="p-2 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <form
              id="coupon-form"
              onSubmit={handleSaveCoupon}
              className="overflow-y-auto flex-1 p-5 md:p-6 space-y-4"
            >
              {couponModalError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span className="leading-relaxed font-medium">{couponModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-1.5">
                  Código Promocional (O que o cliente digita) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PRIMEIRAPARCELA20, SOLAR30, V1T4L1C10"
                  value={couponForm.code}
                  onChange={(e) => {
                    setCouponModalError(null);
                    setCouponForm({
                      ...couponForm,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                    });
                  }}
                  className="w-full bg-[var(--color-background)] text-[var(--color-foreground)] font-mono font-bold tracking-wider border border-[var(--color-border)] rounded-xl p-3 text-base focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">
                  Use apenas letras, números, hífens (-) ou (_). Caracteres especiais como % não são
                  aceitos pelo Stripe.
                </p>
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
                    onChange={(e) => {
                      const newType = e.target.value as "percent" | "amount";
                      const numVal = Number(couponForm.discountValue);
                      let updatedPlanIds = couponForm.applicablePlanIds;
                      if (newType === "amount" && numVal > 0) {
                        updatedPlanIds = updatedPlanIds.filter((id) => {
                          const p = plans.find((plan) => plan.id === id);
                          return !p || Number(p.price) > numVal;
                        });
                      }
                      setCouponForm({
                        ...couponForm,
                        discountType: newType,
                        applicablePlanIds: updatedPlanIds,
                      });
                    }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        const numVal = Number(val);
                        let updatedPlanIds = couponForm.applicablePlanIds;
                        if (couponForm.discountType === "amount" && numVal > 0) {
                          updatedPlanIds = updatedPlanIds.filter((id) => {
                            const p = plans.find((plan) => plan.id === id);
                            return !p || Number(p.price) > numVal;
                          });
                        }
                        setCouponForm({
                          ...couponForm,
                          discountValue: val,
                          applicablePlanIds: updatedPlanIds,
                        });
                      }}
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

              {/* PLAN SELECTION CHECKLIST */}
              <div className="p-4 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                      Planos Onde o Cupom Funcionará *
                    </label>
                    <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                      Selecione quais planos aceitarão este cupom no checkout
                    </p>
                  </div>

                  {/* QUICK BUTTONS */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const discountNum =
                          couponForm.discountType === "amount"
                            ? Number(couponForm.discountValue) || 0
                            : 0;
                        const eligibleIds = plans
                          .filter((p) => p.active !== false)
                          .filter((p) =>
                            couponForm.discountType === "amount" && discountNum > 0
                              ? Number(p.price) > discountNum
                              : true
                          )
                          .map((p) => p.id);
                        setCouponForm({ ...couponForm, applicablePlanIds: eligibleIds });
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                    >
                      Todos os Elegíveis
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const plusPlan = plans.find((p) => p.name.toLowerCase().includes("plus"));
                        if (plusPlan) {
                          setCouponForm({
                            ...couponForm,
                            applicablePlanIds: [plusPlan.id],
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition"
                    >
                      Apenas PLUS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponForm({ ...couponForm, applicablePlanIds: [] });
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  {plans
                    .filter((p) => p.active !== false)
                    .map((plan) => {
                      const planPrice = Number(plan.price) || 0;
                      const discountNum =
                        couponForm.discountType === "amount"
                          ? Number(couponForm.discountValue) || 0
                          : 0;
                      const isPricedOut =
                        couponForm.discountType === "amount" &&
                        discountNum > 0 &&
                        planPrice <= discountNum;
                      const isSelected = couponForm.applicablePlanIds.includes(plan.id);
                      const isPlus = plan.name.toLowerCase().includes("plus");
                      const isPro = plan.name.toLowerCase().includes("pro");

                      return (
                        <div
                          key={plan.id}
                          onClick={() => {
                            if (isPricedOut) return;
                            const newIds = isSelected
                              ? couponForm.applicablePlanIds.filter((id) => id !== plan.id)
                              : [...couponForm.applicablePlanIds, plan.id];
                            setCouponForm({ ...couponForm, applicablePlanIds: newIds });
                          }}
                          className={`p-3.5 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-3 ${
                            isPricedOut
                              ? "opacity-50 bg-red-500/5 border-red-500/20 cursor-not-allowed"
                              : isSelected
                                ? isPlus
                                  ? "bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/30"
                                  : isPro
                                    ? "bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30"
                                    : "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
                                : "bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                                isPricedOut
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : isSelected
                                    ? isPlus
                                      ? "bg-purple-600 border-purple-600 text-white"
                                      : isPro
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-[var(--color-border)] bg-[var(--color-background)]"
                              }`}
                            >
                              {isSelected && !isPricedOut && <Check className="w-3.5 h-3.5" />}
                              {isPricedOut && <X className="w-3.5 h-3.5" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[var(--color-foreground)]">
                                  {plan.name}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-foreground)]">
                                  R$ {planPrice.toFixed(2)}/mês
                                </span>
                              </div>
                              {isPricedOut ? (
                                <p className="text-[11px] text-red-400 font-medium mt-0.5">
                                  ⚠️ Desconto de R$ {discountNum.toFixed(2)} excede ou iguala a
                                  mensalidade de R$ {planPrice.toFixed(2)} (sairia de graça).
                                </p>
                              ) : (
                                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                                  {isSelected
                                    ? "Cupom ativo para este plano no checkout."
                                    : "Cupom não poderá ser utilizado por quem escolher este plano."}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isPricedOut ? (
                              <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                                Incompatível
                              </span>
                            ) : isSelected ? (
                              <span
                                className={`text-[10px] uppercase font-extrabold px-2 py-1 rounded border ${
                                  isPlus
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                    : isPro
                                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                Permitido
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-medium px-2 py-1 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                                Bloqueado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <p className="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed pt-1">
                  🛡️ <strong>Proteção financeira ativa:</strong> Para proteger seu faturamento,
                  cupons com valor fixo em reais (como R$ 100 ou R$ 200) não podem ser ativados em
                  planos cujo valor mensal seja inferior ou igual ao desconto, impedindo checkout
                  com valor zerado.
                </p>
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
            </form>

            {/* STICKY FOOTER */}
            <div className="p-4 md:px-6 md:py-4 border-t border-[var(--color-border)] bg-[var(--color-card)] shrink-0 flex items-center justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-bold text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="coupon-form"
                disabled={couponSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {couponSubmitting
                  ? "Sincronizando..."
                  : editingCoupon
                    ? "Salvar Alterações"
                    : "Salvar & Ativar Cupom"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
