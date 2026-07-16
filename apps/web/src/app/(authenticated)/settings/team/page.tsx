"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
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
  const { currentOrganizationId } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("VIEWER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Falha ao convidar");
    } finally {
      setInviteLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-[var(--color-muted-foreground)]">Membros da organização e convites.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Convidar membro</Button>
      </div>

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
