"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  addWhatsappInboundPhone,
  generateWhatsappPairingCode,
  listWhatsappInboundPhones,
  removeWhatsappInboundPhone,
  updateOrganization,
  uploadOrganizationLogo,
  type WhatsappInboundPhoneRow,
  type WhatsappPairingCodeResponse,
} from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { digitsOnly, maskWhatsappBr } from "@energivia/utils";

export default function OrganizationSettingsPage() {
  const { currentOrganization, currentOrganizationId, refetch } = useOrganization();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [inboundPhones, setInboundPhones] = useState<WhatsappInboundPhoneRow[]>([]);
  const [inboundPhonesLoading, setInboundPhonesLoading] = useState(false);
  const [inboundPhonesError, setInboundPhonesError] = useState<string | null>(null);
  const [newInboundPhone, setNewInboundPhone] = useState("");
  const [newInboundLabel, setNewInboundLabel] = useState("");
  const [inboundSaving, setInboundSaving] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<WhatsappPairingCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  const canEditWhatsappPhones =
    currentOrganization?.role === "OWNER" ||
    currentOrganization?.role === "ADMIN" ||
    currentOrganization?.role === "SALES" ||
    currentOrganization?.role === "ENGINEER";

  const handleGeneratePairingCode = async () => {
    if (!currentOrganizationId) return;
    setPairingLoading(true);
    setInboundPhonesError(null);
    try {
      const res = await generateWhatsappPairingCode(currentOrganizationId);
      setPairingInfo(res);
    } catch (err) {
      setInboundPhonesError(
        err instanceof Error ? err.message : "Falha ao gerar código de pareamento."
      );
    } finally {
      setPairingLoading(false);
    }
  };

  // Polling automático enquanto o código de pareamento estiver na tela
  useEffect(() => {
    if (!pairingInfo || !currentOrganizationId) return;
    const initialCount = inboundPhones.length;
    const interval = setInterval(async () => {
      try {
        const rows = await listWhatsappInboundPhones(currentOrganizationId);
        setInboundPhones(rows);
        if (rows.length > initialCount) {
          setPairingInfo(null); // Pareamento concluído com sucesso!
        }
      } catch {
        // Ignora erro momentâneo de polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pairingInfo, currentOrganizationId, inboundPhones.length]);

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setCnpj(currentOrganization.cnpj ?? "");
      setLogoUrl(currentOrganization.logoUrl ?? "");
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (!currentOrganizationId) return;
    let cancelled = false;
    setInboundPhonesLoading(true);
    setInboundPhonesError(null);
    void listWhatsappInboundPhones(currentOrganizationId)
      .then((rows) => {
        if (!cancelled) setInboundPhones(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setInboundPhonesError(e instanceof Error ? e.message : "Falha ao carregar telefones.");
        }
      })
      .finally(() => {
        if (!cancelled) setInboundPhonesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId]);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId) return;
    setError(null);
    setLoading(true);
    setSaved(false);
    try {
      await updateOrganization(
        currentOrganizationId,
        {
          name: name.trim(),
          cnpj: cnpj.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        },
        currentOrganizationId
      );
      await refetch();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar dados da empresa.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoError(null);
    setIsUploadingLogo(true);
    try {
      const uploadedLogoUrl = await uploadOrganizationLogo(file);
      setLogoUrl(uploadedLogoUrl);
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Falha ao enviar logo da empresa");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddInboundPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId || !newInboundPhone.trim()) return;
    setInboundPhonesError(null);
    setInboundSaving(true);
    try {
      const row = await addWhatsappInboundPhone(currentOrganizationId, {
        phone: newInboundPhone.trim(),
        label: newInboundLabel.trim() || undefined,
      });
      setInboundPhones((prev) =>
        [...prev, row].sort((a, b) => a.phoneDigits.localeCompare(b.phoneDigits))
      );
      setNewInboundPhone("");
      setNewInboundLabel("");
    } catch (err) {
      setInboundPhonesError(err instanceof Error ? err.message : "Falha ao adicionar.");
    } finally {
      setInboundSaving(false);
    }
  };

  const handleRemoveInboundPhone = async (phoneId: string) => {
    if (!currentOrganizationId) return;
    setInboundPhonesError(null);
    try {
      await removeWhatsappInboundPhone(currentOrganizationId, phoneId);
      setInboundPhones((prev) => prev.filter((p) => p.id !== phoneId));
    } catch (err) {
      setInboundPhonesError(err instanceof Error ? err.message : "Falha ao remover.");
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Selecione uma organização.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organização</h1>
        <p className="text-[var(--color-muted-foreground)]">Nome, CNPJ e logo da organização.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da organização</CardTitle>
          <CardDescription>Estes dados identificam sua empresa no Energivia.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: SolarTech Engenharia"
              required
            />
            <Input
              label="CNPJ"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="font-mono"
            />
            <ImageDropzone
              label="Logo da empresa (opcional)"
              value={logoUrl}
              onSelectFile={handleLogoUpload}
              onClear={() => setLogoUrl("")}
              isUploading={isUploadingLogo}
              disabled={loading || isUploadingLogo}
              accept="image/jpeg,image/png,image/webp"
              helperText="Formatos aceitos: JPG, PNG, WEBP."
              errorMessage={logoError}
            />
            {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}
            {saved && <p className="text-sm text-[var(--color-primary)]">Salvo com sucesso.</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-primary)]/20 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>📲 Assistente de IA no WhatsApp</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Exclusivo para Assinantes
                </span>
              </CardTitle>
              <CardDescription>
                Conecte seu WhatsApp pessoal ou da sua equipe para dimensionar kits solares,
                calcular economia e gerar propostas comerciais automáticas direto pelo WhatsApp.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção do Código de Pareamento */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                  ⚡ Conexão Rápida por Código (Pareamento)
                </h4>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Gere um código exclusivo e envie para o robô no WhatsApp para vincular seu número
                  instantaneamente à empresa.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleGeneratePairingCode}
                disabled={pairingLoading || !canEditWhatsappPhones}
                className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                {pairingLoading ? "Gerando código…" : "📲 Conectar meu WhatsApp"}
              </Button>
            </div>

            {pairingInfo && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Envie a mensagem abaixo para o número <strong>{pairingInfo.botNumber}</strong>:
                </p>
                <div className="my-2 select-all rounded-md bg-white/80 py-2 font-mono text-2xl font-black tracking-widest text-emerald-700 shadow-inner dark:bg-black/40 dark:text-emerald-300">
                  {pairingInfo.formattedMessage}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <a
                    href={pairingInfo.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                  >
                    <span>💬 Abrir WhatsApp e Enviar Código</span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPairingInfo(null)}
                  >
                    Fechar
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
                  ⏳ Este código expira em 15 minutos. A tela atualizará assim que você enviar.
                </p>
              </div>
            )}
          </div>

          {/* Lista de Telefones Autorizados */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
              Números Autorizados ({inboundPhones.length})
            </h4>

            {inboundPhonesLoading ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Carregando números…</p>
            ) : null}
            {inboundPhonesError ? (
              <p className="text-sm text-[var(--color-destructive)]">{inboundPhonesError}</p>
            ) : null}
            {!inboundPhonesLoading && inboundPhones.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Nenhum número de WhatsApp vinculado ainda. Clique em{" "}
                <strong>"Conectar meu WhatsApp"</strong> acima para vincular.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
                {inboundPhones.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono font-medium">
                        {maskWhatsappBr(row.phoneDigits)}
                      </span>
                      {row.label ? (
                        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {row.label}
                        </span>
                      ) : null}
                    </div>
                    {canEditWhatsappPhones ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
                        onClick={() => void handleRemoveInboundPhone(row.id)}
                      >
                        Desvincular
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {/* Cadastro Manual Alternativo */}
            {canEditWhatsappPhones && (
              <details className="mt-4 text-xs text-[var(--color-muted-foreground)]">
                <summary className="cursor-pointer font-medium hover:text-[var(--color-foreground)]">
                  + Adicionar número de vendedor manualmente
                </summary>
                <form
                  onSubmit={handleAddInboundPhone}
                  className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start"
                >
                  <div className="min-w-[200px] flex-1">
                    <Input
                      type="tel"
                      label="Telefone com DDD"
                      inputMode="tel"
                      autoComplete="tel"
                      value={newInboundPhone}
                      onChange={(e) => setNewInboundPhone(maskWhatsappBr(e.target.value))}
                      placeholder="(44) 99158-5309"
                      disabled={inboundSaving}
                    />
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <Input
                      label="Nome do Vendedor / Rótulo"
                      value={newInboundLabel}
                      onChange={(e) => setNewInboundLabel(e.target.value)}
                      placeholder="Ex.: Vendedor João"
                      disabled={inboundSaving}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={inboundSaving || digitsOnly(newInboundPhone).length < 10}
                    className="mt-6"
                  >
                    {inboundSaving ? "Salvando…" : "Salvar"}
                  </Button>
                </form>
              </details>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Gerencie membros e convites da organização.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/configuracoes/equipe">
            <Button variant="outline">Gerenciar equipe</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
