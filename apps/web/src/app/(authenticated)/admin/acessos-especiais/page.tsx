"use client";

import React, { useState, useEffect, useCallback } from "react";
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

export default function SpecialAccessAdminPage() {
  const [items, setItems] = useState<SpecialAccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Painel de Administração · Segurança & Acessos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Acessos Especiais (Whitelist)
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Conceda plano Plus ilimitado e IA no WhatsApp sem necessidade de cupons ou Stripe. O
              kill-switch integrado revoga a plataforma web e desconecta o bot do WhatsApp
              simultaneamente em 1 clique.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchItems(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`}
              />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-medium text-slate-400">Total de Contas</span>
            <div className="text-2xl font-bold text-white mt-1">{items.length}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Gerenciadas no ecossistema
            </span>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Contas Ativas
            </span>
            <div className="text-2xl font-bold text-white mt-1">{activeCount}</div>
            <span className="text-[11px] text-emerald-500/80 mt-0.5 block">
              Plano Plus liberado
            </span>
          </div>

          <div className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-medium text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Acessos Revogados
            </span>
            <div className="text-2xl font-bold text-white mt-1">{revokedCount}</div>
            <span className="text-[11px] text-red-400/80 mt-0.5 block">
              Plataforma e bot travados
            </span>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Pareados
            </span>
            <div className="text-2xl font-bold text-white mt-1">{linkedWhatsappCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Números ativos no bot de IA
            </span>
          </div>
        </div>

        {/* FORMULÁRIO DE INCLUSÃO RÁPIDA */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-md backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Adicionar Novo Acesso Especial
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Não é obrigatório configurar no Railway ou Vercel. Você pode liberar a conta
                digitando o e-mail abaixo.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Também suporta variável <code>COMPLIMENTARY_ACCESS_EMAILS</code>
              </span>
            </div>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail do Usuário / Marketing <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: marketing@suaempresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Finalidade / Observação
                </label>
                <input
                  type="text"
                  placeholder="ex: Criação de campanhas e testes no WhatsApp"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={submittingAdd || !newEmail.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
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
                className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2.5 ${
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por e-mail, nome ou organização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="text-xs text-slate-400">
              Exibindo <span className="font-semibold text-white">{filteredItems.length}</span> de{" "}
              <span className="font-semibold text-white">{items.length}</span> registros
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">E-mail & Usuário</th>
                  <th className="py-3.5 px-4 font-semibold">Organização Vinculada</th>
                  <th className="py-3.5 px-4 font-semibold">Origem & Notas</th>
                  <th className="py-3.5 px-4 font-semibold">WhatsApp Bot</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ação Unificada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                      Carregando lista de acessos especiais...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isRevoked = item.status === "REVOKED";
                    const isActing = actionLoadingEmail === item.email;

                    return (
                      <tr key={item.email} className="hover:bg-slate-900/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white text-sm">{item.email}</div>
                          {item.userName ? (
                            <div className="text-[11px] text-slate-400">{item.userName}</div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic">
                              Conta não cadastrada ainda
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.organizationName ? (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-medium">{item.organizationName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                                item.source === "ENV"
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}
                            >
                              {item.source === "ENV" ? "Variável Railway" : "Painel Admin"}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.whatsappPhone ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-xs">
                              <MessageSquare className="w-3 h-3 text-emerald-400" />
                              <span>{item.whatsappPhone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Não conectado</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                              Acesso Revogado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Autorizado (Plus)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isRevoked ? (
                            <button
                              onClick={() => handleRestore(item.email)}
                              disabled={isActing}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-medium text-xs border border-slate-700 transition active:scale-95 disabled:opacity-50"
                            >
                              {isActing ? "Restaurando..." : "Reativar Acesso"}
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmRevokeItem(item)}
                              disabled={isActing}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg font-medium text-xs border border-red-500/30 hover:border-red-500 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Derrubar Acesso Completo?</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Você está prestes a revogar o acesso especial de:
                  <span className="block font-mono text-amber-300 font-semibold my-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800">
                    {confirmRevokeItem.email}
                  </span>
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-300 space-y-1 mt-3">
                  <p className="font-semibold">O que acontece na mesma hora:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-200/90">
                    <li>O número de WhatsApp pareado é desconectado imediatamente;</li>
                    <li>Qualquer mensagem enviada no WhatsApp recebe recusa do bot;</li>
                    <li>O usuário cai no bloqueio de assinatura na plataforma web;</li>
                    <li>Se ele quiser usar a ferramenta, terá que assinar via Stripe.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRevokeItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 flex items-center gap-1.5"
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
