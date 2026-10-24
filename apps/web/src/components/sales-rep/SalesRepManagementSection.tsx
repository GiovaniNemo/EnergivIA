"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  UserPlus,
  Users,
  ShieldCheck,
  Clock,
  UserCheck,
  Copy,
  Check,
  Trash2,
  Percent,
  Mail,
  User,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AuthorizedSalesRep,
  listAuthorizedSalesReps,
  authorizeSalesRep,
  revokeSalesRep,
} from "@/lib/sales-rep-api";

export function SalesRepManagementSection(): JSX.Element {
  const [reps, setReps] = useState<AuthorizedSalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [commissionFirstMonth, setCommissionFirstMonth] = useState("20");
  const [commissionMonths2To12, setCommissionMonths2To12] = useState("10");
  const [commissionMonths13Plus, setCommissionMonths13Plus] = useState("5");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchReps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAuthorizedSalesReps();
      setReps(data);
    } catch {
      // Falha tratada silenciosamente
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setFeedback({ type: "error", message: "Informe um e-mail válido para liberar o vendedor." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await authorizeSalesRep({
        email: email.trim(),
        name: name.trim() || undefined,
        commissionFirstMonth: Number(commissionFirstMonth) || 20,
        commissionMonths2To12: Number(commissionMonths2To12) || 10,
        commissionMonths13Plus: Number(commissionMonths13Plus) || 5,
        notes: notes.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `Vendedor ${email} liberado com sucesso com a regra de comissionamento escalonada (20% na 1ª parcela, 10% da 2ª à 12ª e 5% a partir da 13ª)!`,
      });

      setEmail("");
      setName("");
      setCommissionFirstMonth("20");
      setCommissionMonths2To12("10");
      setCommissionMonths13Plus("5");
      setNotes("");
      await fetchReps();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao liberar acesso ao vendedor.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (repEmail: string) => {
    if (!confirm(`Deseja realmente revogar o acesso comercial de ${repEmail}?`)) {
      return;
    }

    setRevokingEmail(repEmail);
    try {
      await revokeSalesRep(repEmail);
      await fetchReps();
      setFeedback({
        type: "success",
        message: `Acesso comercial de ${repEmail} revogado com sucesso.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao revogar acesso.",
      });
    } finally {
      setRevokingEmail(null);
    }
  };

  const handleCopyLink = async (link: string, code: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      // Fallback
    }
  };

  const activeRepsCount = reps.filter((r) => r.status === "ACTIVE").length;
  const registeredRepsCount = reps.filter((r) => r.status === "ACTIVE" && r.isRegistered).length;
  const pendingRepsCount = reps.filter((r) => r.status === "ACTIVE" && !r.isRegistered).length;

  return (
    <div className="space-y-6">
      {/* Mini KPIs de Gestão de Vendedores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Vendedores Liberados</p>
            <p className="text-2xl font-bold text-white mt-1">{activeRepsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Com Conta Ativa</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{registeredRepsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Aguardando Cadastro</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingRepsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Formulário de Liberação de Novo Vendedor */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Liberar Novo Vendedor
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Informe o e-mail do vendedor. Ele receberá acesso comercial e o link exclusivo
                gerado.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchReps}
            className="text-slate-400 hover:text-white hover:bg-white/5 text-xs gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Recarregar</span>
          </Button>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            <Info className="h-4 w-4 shrink-0" />
            <span className="flex-1">{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="hover:underline text-[11px] ml-2"
            >
              Fechar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
            {/* E-mail (Obrigatório) */}
            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>E-mail do Vendedor *</span>
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@empresa.com.br"
                className="bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 text-xs sm:text-sm focus:border-emerald-500/50"
              />
            </div>

            {/* Nome (Opcional) */}
            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Nome Completo</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 text-xs sm:text-sm focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Seção de Comissionamento Escalonado por Tempo de Permanência */}
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Regra de Comissionamento Escalonada
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Padrão 20% · 10% · 5%
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                A comissão evolui conforme a permanência do cliente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1ª Parcela */}
              <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-emerald-400">
                    1ª Parcela (Mês 1)
                  </label>
                  <span className="text-[10px] text-slate-500 uppercase">Ativação</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionFirstMonth}
                    onChange={(e) => setCommissionFirstMonth(e.target.value)}
                    placeholder="20"
                    className="bg-slate-950 border-white/10 text-white text-xs sm:text-sm pr-7 focus:border-emerald-500/50 font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Primeira mensalidade paga pelo cliente</p>
              </div>

              {/* 2ª à 12ª Parcela */}
              <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">2ª à 12ª Parcela</label>
                  <span className="text-[10px] text-slate-500 uppercase">1º Ano</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionMonths2To12}
                    onChange={(e) => setCommissionMonths2To12(e.target.value)}
                    placeholder="10"
                    className="bg-slate-950 border-white/10 text-white text-xs sm:text-sm pr-7 focus:border-emerald-500/50 font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Do 2º mês até completar 1 ano</p>
              </div>

              {/* 13ª Parcela em diante */}
              <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-400">
                    13ª Parcela em diante
                  </label>
                  <span className="text-[10px] text-slate-500 uppercase">Recorrência</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionMonths13Plus}
                    onChange={(e) => setCommissionMonths13Plus(e.target.value)}
                    placeholder="5"
                    className="bg-slate-950 border-white/10 text-white text-xs sm:text-sm pr-7 focus:border-emerald-500/50 font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">A partir do 2º ano (vitalício)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>O link de indicação exclusivo é gerado e ativado imediatamente.</span>
            </div>

            <Button
              type="submit"
              disabled={submitting || !email.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm px-5 py-2 rounded-xl transition-all shadow-lg shadow-emerald-950/50 gap-2 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>{submitting ? "Liberando..." : "Liberar Acesso Comercial"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Tabela de Vendedores Autorizados */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Vendedores Cadastrados & Liberados</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
              {reps.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-400/60" />
            Carregando vendedores autorizados...
          </div>
        ) : reps.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum vendedor autorizado ainda. Adicione o e-mail de um vendedor acima para liberar o
            acesso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Status de Cadastro</th>
                  <th className="py-3 px-4">Link de Indicação</th>
                  <th className="py-3 px-4">Comissão Escalonada</th>
                  <th className="py-3 px-4">Integradores</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {reps.map((rep) => {
                  const isRevoked = rep.status === "REVOKED";
                  return (
                    <tr
                      key={rep.email}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isRevoked ? "opacity-50" : ""
                      }`}
                    >
                      {/* Vendedor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 font-semibold text-xs shrink-0">
                            {(rep.userName || rep.name || rep.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-xs">
                              {rep.userName || rep.name || "Aguardando nome"}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{rep.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status de Cadastro */}
                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            Revogado
                          </span>
                        ) : rep.isRegistered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <UserCheck className="h-3 w-3" />
                            Cadastrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Aguardando Cadastro
                          </span>
                        )}
                      </td>

                      {/* Link de Indicação */}
                      <td className="py-3.5 px-4">
                        {rep.referralLink ? (
                          <div className="flex items-center gap-2 max-w-[260px]">
                            <span className="font-mono text-[11px] text-emerald-300 truncate bg-slate-950/60 px-2 py-1 rounded-lg border border-white/10">
                              {rep.referralCode}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopyLink(rep.referralLink!, rep.referralCode || rep.email)
                              }
                              className="h-7 px-2 text-slate-300 hover:text-white hover:bg-white/10 text-[11px] gap-1"
                            >
                              {copiedCode === (rep.referralCode || rep.email) ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Comissão Escalonada */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {rep.commissionTiers ? (
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="text-emerald-400 font-semibold">
                              1ª parc: {rep.commissionTiers.firstMonth}%
                            </span>
                            <span className="text-slate-300">
                              2ª a 12ª: {rep.commissionTiers.months2To12}%
                            </span>
                            <span className="text-slate-400">
                              13ª+: {rep.commissionTiers.months13Plus}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs">{rep.commissionRate ?? 10}%</span>
                        )}
                      </td>

                      {/* Integradores */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-slate-200 border border-white/10">
                          {rep.tenantsCount} empresas
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        {!isRevoked ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={revokingEmail === rep.email}
                            onClick={() => handleRevoke(rep.email)}
                            className="h-7 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[11px] gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Revogar</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              authorizeSalesRep({
                                email: rep.email,
                                name: rep.name || undefined,
                                commissionFirstMonth: rep.commissionTiers?.firstMonth ?? 20,
                                commissionMonths2To12: rep.commissionTiers?.months2To12 ?? 10,
                                commissionMonths13Plus: rep.commissionTiers?.months13Plus ?? 5,
                              }).then(fetchReps)
                            }
                            className="h-7 px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-[11px]"
                          >
                            Reativar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card Explicativo de Como Funciona */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/30 p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Info className="h-4 w-4 text-emerald-400" />
          <span>Como funciona a liberação de vendedores e comissionamento?</span>
        </div>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
          <li>
            <strong className="text-slate-200">Se o vendedor já tem conta:</strong> O cargo dele é
            atualizado imediatamente para Vendedor da Plataforma, liberando esta tela e gerando o
            link exclusivo.
          </li>
          <li>
            <strong className="text-slate-200">Se o vendedor ainda não tem conta:</strong> Ele fica
            na lista com status &quot;Aguardando Cadastro&quot;. Assim que fizer login ou cadastro
            pelo Auth0/Google com este mesmo e-mail, o sistema reconhece a liberação e ativa a conta
            dele automaticamente.
          </li>
          <li>
            <strong className="text-slate-200">Comissão Escalonada no Tempo:</strong> Na 1ª parcela
            de cada integrador (ativação), o vendedor recebe 20%. Da 2ª até a 12ª parcela (1º ano),
            recebe 10%. A partir da 13ª parcela em diante (recorrência contínua), a comissão é de
            5%.
          </li>
          <li>
            <strong className="text-slate-200">Atribuição de comissão:</strong> Todo integrador que
            criar conta através do link exclusivo do vendedor terá a carteira e comissões vinculadas
            a ele.
          </li>
        </ul>
      </div>
    </div>
  );
}
