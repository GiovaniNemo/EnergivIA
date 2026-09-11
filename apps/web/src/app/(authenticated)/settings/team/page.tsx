"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  resendInvite,
  type Member,
} from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { cn } from "@energivia/utils";

const ROLES = ["OWNER", "ADMIN", "ENGINEER", "SALES", "VIEWER"] as const;
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  ENGINEER: "Engenheiro",
  SALES: "Comercial",
  VIEWER: "Visualizador",
};
const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Ativo",
  PENDING: "Pendente",
  EXPIRED: "Expirado",
};

function getStatusBadgeClass(status: string): string {
  if (status === "ACCEPTED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "PENDING") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border border-slate-200 bg-slate-100 text-slate-700";
}

export default function TeamPage() {
  const { currentOrganizationId, currentOrganization, user } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teamUpgradeModalOpen, setTeamUpgradeModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("VIEWER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const PLATFORM_ADMIN_EMAILS = [
    "sgiovanimendes@gmail.com",
    "contato@energivia.com.br",
    "admin@energivia.com.br",
  ];

  const userEmail = (user?.email || "").toLowerCase().trim();
  const globalRole = (user?.role || "").toUpperCase();
  const isPlatformAdmin =
    globalRole === "PLATFORM" ||
    globalRole === "SUPERADMIN" ||
    PLATFORM_ADMIN_EMAILS.includes(userEmail);

  // Live Email Diagnostics State (Apenas para ADMINs)
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagEmail, setDiagEmail] = useState("sgiovanimendes@gmail.com");
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null);

  const runEmailDiagnosis = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const res = await fetch(
        `/api/proxy/health/test-email?to=${encodeURIComponent(diagEmail.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setDiagResult(data);
    } catch (err: unknown) {
      setDiagResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setDiagLoading(false);
    }
  };

  const load = async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    try {
      const list = await getMembers(currentOrganizationId);
      setMembers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentOrganizationId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      await inviteMember(currentOrganizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("VIEWER");
      setToastMessage("Convite enviado com sucesso!");
      setTimeout(() => setToastMessage(null), 4000);
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Falha ao convidar");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResend = async (memberId: string, email: string) => {
    if (!currentOrganizationId) return;
    setResendingId(memberId);
    try {
      const res = await resendInvite(currentOrganizationId, memberId);
      setToastMessage(res.message || `Convite reenviado para ${email}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Falha ao reenviar");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setResendingId(null);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    if (!currentOrganizationId) return;
    try {
      await updateMemberRole(currentOrganizationId, memberId, role);
      await load();
    } catch {}
  };

  const handleRemove = async (memberId: string) => {
    if (!currentOrganizationId) return;
    if (!confirm("Remover este membro da organização?")) return;
    try {
      await removeMember(currentOrganizationId, memberId);
      await load();
    } catch {}
  };

  if (!currentOrganizationId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Selecione uma organização.</p>
      </div>
    );
  }

  const effectiveRole = (currentOrganization?.role || user?.role || "").toUpperCase();
  const canManageTeam = effectiveRole === "OWNER" || effectiveRole === "ADMIN" || isPlatformAdmin;

  if (!canManageTeam) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
        <div className="rounded-full bg-amber-500/10 p-3 text-amber-500 mb-4">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">Acesso Restrito</h2>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
          Apenas administradores e o proprietário da organização podem gerenciar a equipe e convidar
          novos membros.
        </p>
        <Link
          href="/painel"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[#43a047]"
        >
          Voltar ao Painel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-[var(--color-muted-foreground)]">Membros da organização e convites.</p>
        </div>
        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <Button
              variant="outline"
              onClick={() => setDiagOpen((prev) => !prev)}
              className="border-dashed text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
            >
              🛠️ Testar Servidor de E-mail
            </Button>
          )}
          <Button
            onClick={() => {
              if (
                user?.isTrial ||
                !currentOrganization?.subscription ||
                currentOrganization?.subscription?.status !== "active"
              ) {
                setTeamUpgradeModalOpen(true);
              } else if (
                user?.membersLimit !== null &&
                user?.membersLimit !== undefined &&
                members.length >= user.membersLimit
              ) {
                setTeamUpgradeModalOpen(true);
              } else {
                setInviteOpen(true);
              }
            }}
          >
            Convidar membro
          </Button>
        </div>
      </div>

      {/* Modal de Upgrade para Equipe */}
      <Dialog open={teamUpgradeModalOpen} onOpenChange={setTeamUpgradeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </span>
              Gestão de Equipe & Vendedores
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              {user?.isTrial ? (
                <>
                  No período de teste gratuito (Plano Start), o acesso é individual. O convite e
                  gerenciamento de múltiplos usuários na equipe é liberado no{" "}
                  <strong>Plano Essencial</strong> (até 2 usuários) e <strong>Plano Pro</strong>{" "}
                  (até 5 usuários).
                </>
              ) : (
                <>
                  Você atingiu o limite de <strong>{user?.membersLimit ?? 2} membros</strong> na
                  equipe do seu plano atual ({user?.planName || "Plano Essencial"}). Para adicionar
                  mais vendedores e gestores, faça upgrade para o <strong>Plano Pro</strong> (até 5
                  usuários) ou <strong>Plano Plus</strong> (ilimitado).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setTeamUpgradeModalOpen(false)}>
              Fechar
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              onClick={() => {
                setTeamUpgradeModalOpen(false);
                window.location.href = "/gestao/meus-planos";
              }}
            >
              Conhecer Planos &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isPlatformAdmin && diagOpen && (
        <Card className="border-cyan-500/30 bg-cyan-950/20">
          <CardHeader>
            <CardTitle className="text-cyan-400">Diagnóstico ao Vivo do Servidor SMTP</CardTitle>
            <CardDescription>
              Dispare um teste direto do servidor de backend para inspecionar as variáveis e
              conectividade com o Zoho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={diagEmail}
                onChange={(e) => setDiagEmail(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={runEmailDiagnosis} disabled={diagLoading || !diagEmail.trim()}>
                {diagLoading ? "Testando no Servidor..." : "Disparar Teste do Servidor"}
              </Button>
            </div>

            {diagResult && (
              <div className="rounded-lg bg-black/60 p-4 font-mono text-xs text-emerald-400">
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(diagResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>Nome, e-mail, função e data de entrada.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-[var(--color-muted-foreground)]">Carregando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="pb-2 text-left font-medium">Nome</th>
                    <th className="pb-2 text-left font-medium">E-mail</th>
                    <th className="pb-2 text-left font-medium">Função</th>
                    <th className="pb-2 text-left font-medium">Status</th>
                    <th className="pb-2 text-left font-medium">Entrou em</th>
                    <th className="pb-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--color-border)]">
                      <td className="py-3">{m.name ?? "—"}</td>
                      <td className="py-3">{m.email ?? "—"}</td>
                      <td className="py-3">
                        {m.role === "OWNER" ? (
                          ROLE_LABELS.OWNER
                        ) : (
                          <Select
                            fullWidth={false}
                            className="min-w-[160px]"
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          >
                            {ROLES.filter((r) => r !== "OWNER").map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getStatusBadgeClass(m.status)
                          )}
                        >
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {m.role !== "OWNER" && m.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resendingId === m.id}
                              onClick={() => handleResend(m.id, m.email!)}
                            >
                              {resendingId === m.id ? "Reenviando…" : "Reenviar e-mail"}
                            </Button>
                          )}
                          {m.role !== "OWNER" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--color-destructive)]"
                              onClick={() => handleRemove(m.id)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setInviteOpen(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Convidar membro</CardTitle>
              <CardDescription>
                Envie um convite por e-mail. O usuário receberá um link para entrar na organização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
                <Select
                  label="Função"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.filter((r) => r !== "OWNER").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
                {inviteError && (
                  <p className="text-sm text-[var(--color-destructive)]">{inviteError}</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={inviteLoading}>
                    {inviteLoading ? "Enviando…" : "Enviar convite"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
