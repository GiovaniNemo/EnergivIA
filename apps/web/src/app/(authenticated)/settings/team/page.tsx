"use client";

import { useState, useEffect } from "react";
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
  const { currentOrganizationId, user } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
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
          <Button onClick={() => setInviteOpen(true)}>Convidar membro</Button>
        </div>
      </div>

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
