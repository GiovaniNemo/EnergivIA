"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  UserCheck,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  MessageSquare,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  Check,
} from "lucide-react";

interface SpecialAccessItem {
  email: string;
  source: "ENV" | "MANUAL";
  status: "ACTIVE" | "REVOKED";
  notes?: string;
  userId?: string | null;
  userName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  whatsappPhone?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

const PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

export default function SpecialAccessAdminPage() {
  const router = useRouter();
  const { user, currentOrganization } = useOrganization();
  const [items, setItems] = useState<SpecialAccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);

  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const orgRole = (currentOrganization?.role || "").toUpperCase();

  const isPlatform =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    orgRole === "PLATFORM" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  useEffect(() => {
    if (user && !isPlatform) {
      router.replace("/painel");
    }
  }, [user, isPlatform, router]);

  // Formulário de adição
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal de confirmação de revogação
  const [confirmRevokeItem, setConfirmRevokeItem] = useState<SpecialAccessItem | null>(null);

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/proxy/admin/special-access", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Falha ao carregar acessos especiais:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setSubmittingAdd(true);
    setFormFeedback(null);

    try {
      const res = await fetch("/api/proxy/admin/special-access/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          notes: newNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Erro ao adicionar acesso especial.");
      }

      setNewEmail("");
      setNewNotes("");
      setFormFeedback({
        type: "success",
        message: "Acesso especial liberado com sucesso! A conta agora usufrui do Plano Plus.",
      });
      await fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setFormFeedback({ type: "error", message: msg });
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!confirmRevokeItem) return;
    const targetEmail = confirmRevokeItem.email;
    setActionLoadingEmail(targetEmail);
    setConfirmRevokeItem(null);

    try {
      const res = await fetch("/api/proxy/admin/special-access/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (!res.ok) {
        throw new Error("Falha ao revogar acesso especial.");
      }

      await fetchItems();
    } catch (err) {
      console.error("Erro ao revogar:", err);
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleRestore = async (email: string) => {
    setActionLoadingEmail(email);
    try {
      const res = await fetch("/api/proxy/admin/special-access/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Falha ao restaurar acesso especial.");
      }

      await fetchItems();
    } catch (err) {
      console.error("Erro ao restaurar:", err);
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.email.toLowerCase().includes(q) ||
      (item.userName && item.userName.toLowerCase().includes(q)) ||
      (item.organizationName && item.organizationName.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  });

  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const revokedCount = items.filter((i) => i.status === "REVOKED").length;
  const linkedWhatsappCount = items.filter(
    (i) => Boolean(i.whatsappPhone) && i.status === "ACTIVE"
  ).length;

  if (user && !isPlatform) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Painel de Administração · Segurança & Acessos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--color-foreground)]">
              Acessos Especiais (Whitelist)
            </h1>
            <p className="text-sm md:text-base text-[var(--color-muted-foreground)] mt-1.5 max-w-3xl leading-relaxed">
              Conceda plano Plus ilimitado e IA no WhatsApp sem necessidade de cupons ou Stripe. O
              kill-switch integrado revoga a plataforma web e desconecta o bot do WhatsApp
              simultaneamente em 1 clique.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchItems(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-emerald-400 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Total de Contas
            </span>
            <div className="text-3xl font-bold text-[var(--color-foreground)] mt-2">
              {items.length}
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)] mt-1 block">
              Gerenciadas no ecossistema
            </span>
          </div>

          <div className="bg-[var(--color-card)] border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Contas Ativas
            </span>
            <div className="text-3xl font-bold text-[var(--color-foreground)] mt-2">
              {activeCount}
            </div>
            <span className="text-xs text-emerald-400/80 mt-1 block">Plano Plus liberado</span>
          </div>

          <div className="bg-[var(--color-card)] border border-red-500/20 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-400" />
              Acessos Revogados
            </span>
            <div className="text-3xl font-bold text-[var(--color-foreground)] mt-2">
              {revokedCount}
            </div>
            <span className="text-xs text-red-400/80 mt-1 block">Plataforma e bot travados</span>
          </div>

          <div className="bg-[var(--color-card)] border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Pareados
            </span>
            <div className="text-3xl font-bold text-[var(--color-foreground)] mt-2">
              {linkedWhatsappCount}
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)] mt-1 block">
              Números ativos no bot de IA
            </span>
          </div>
        </div>

        {/* FORMULÁRIO DE INCLUSÃO RÁPIDA */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Adicionar Novo Acesso Especial
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Não é obrigatório configurar no Railway ou Vercel. Você pode liberar a conta
                digitando o e-mail abaixo.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-background)] px-3.5 py-2 rounded-xl border border-[var(--color-border)]">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Também suporta variável{" "}
                <code className="text-emerald-400 font-mono">COMPLIMENTARY_ACCESS_EMAILS</code>
              </span>
            </div>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  E-mail do Usuário / Marketing <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: marketing@suaempresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]/60 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Finalidade / Observação
                </label>
                <input
                  type="text"
                  placeholder="ex: Criação de campanhas e testes no WhatsApp"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]/60 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={submittingAdd || !newEmail.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {submittingAdd ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Liberar Acesso</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {formFeedback && (
              <div
                className={`p-3.5 rounded-xl text-sm font-medium border flex items-center gap-2.5 ${
                  formFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}
              >
                {formFeedback.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{formFeedback.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* TABELA DE CONTAS AUTORIZADAS */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-88">
              <Search className="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por e-mail, nome ou organização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]/60 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>

            <div className="text-sm text-[var(--color-muted-foreground)]">
              Exibindo{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {filteredItems.length}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-[var(--color-foreground)]">{items.length}</span>{" "}
              registros
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--color-background)] text-[var(--color-muted-foreground)] uppercase tracking-wider text-xs border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-4 px-5 font-semibold">E-mail & Usuário</th>
                  <th className="py-4 px-5 font-semibold">Organização Vinculada</th>
                  <th className="py-4 px-5 font-semibold">Origem do Cadastro & Notas</th>
                  <th className="py-4 px-5 font-semibold">WhatsApp Bot</th>
                  <th className="py-4 px-5 font-semibold">Status</th>
                  <th className="py-4 px-5 font-semibold text-right">Ação Unificada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
                      Carregando lista de acessos especiais...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isRevoked = item.status === "REVOKED";
                    const isActing = actionLoadingEmail === item.email;

                    return (
                      <tr
                        key={item.email}
                        className="hover:bg-[var(--color-muted)]/40 transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="font-semibold text-[var(--color-foreground)] text-sm">
                            {item.email}
                          </div>
                          {item.userName ? (
                            <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                              {item.userName}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--color-muted-foreground)]/70 italic mt-0.5">
                              Conta não cadastrada ainda
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {item.organizationName ? (
                            <div className="flex items-center gap-2 text-[var(--color-foreground)]">
                              <Building2 className="w-4 h-4 text-[var(--color-muted-foreground)] shrink-0" />
                              <span className="font-medium text-sm">{item.organizationName}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted-foreground)] text-sm">—</span>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-medium tracking-wide ${
                                item.source === "ENV"
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {item.source === "ENV" ? "Variável Railway" : "Inclusão Manual"}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-xs text-[var(--color-muted-foreground)] line-clamp-1 mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {item.whatsappPhone ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-xs">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{item.whatsappPhone}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted-foreground)] text-xs">
                              Não conectado
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-xs">
                              <XCircle className="w-4 h-4 text-red-400" />
                              Acesso Revogado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Autorizado (Plus)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          {isRevoked ? (
                            <button
                              onClick={() => handleRestore(item.email)}
                              disabled={isActing}
                              className="px-3.5 py-2 bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] rounded-lg font-medium text-xs border border-[var(--color-border)] transition active:scale-95 disabled:opacity-50"
                            >
                              {isActing ? "Restaurando..." : "Reativar Acesso"}
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmRevokeItem(item)}
                              disabled={isActing}
                              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg font-medium text-xs border border-red-500/20 hover:border-red-600 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span>{isActing ? "Derrubando..." : "Revogar Acesso"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE REVOGAÇÃO (KILL-SWITCH) */}
        {confirmRevokeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--color-card)] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                  Derrubar Acesso Completo?
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-2 leading-relaxed">
                  Você está prestes a revogar o acesso especial de:
                  <span className="block font-mono text-emerald-400 font-semibold my-2 p-2.5 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)]">
                    {confirmRevokeItem.email}
                  </span>
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-xs text-red-300 space-y-1.5 mt-3">
                  <p className="font-semibold text-sm">O que acontece na mesma hora:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-red-200/90">
                    <li>O número de WhatsApp pareado é desconectado imediatamente;</li>
                    <li>Qualquer mensagem enviada no WhatsApp recebe recusa do bot;</li>
                    <li>O usuário cai no bloqueio de assinatura na plataforma web;</li>
                    <li>Se ele quiser usar a ferramenta, terá que assinar via Stripe.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmRevokeItem(null)}
                  className="px-4 py-2.5 bg-[var(--color-card)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Confirmar e Derrubar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
