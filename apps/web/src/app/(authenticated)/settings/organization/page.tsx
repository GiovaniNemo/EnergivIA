"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  addWhatsappInboundPhone,
  listWhatsappInboundPhones,
  removeWhatsappInboundPhone,
  updateOrganization,
  uploadOrganizationLogo,
  type WhatsappInboundPhoneRow,
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

  const canEditWhatsappPhones =
    currentOrganization?.role === "OWNER" || currentOrganization?.role === "ADMIN";

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

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp — números da sua empresa</CardTitle>
          <CardDescription>
            Cadastre os números dos <strong>vendedores da integradora</strong> (WhatsApp com o qual
            eles falam com clientes). Para a integração Cloud API, o sistema também precisa
            reconhecer o <strong>número da linha WhatsApp Business que recebe as mensagens</strong>{" "}
            (o mesmo da Meta, como no Gerenciador do WhatsApp): inclua esse número nesta lista além
            dos vendedores, sem mudar o fluxo de cadastro. Cada número pode estar ligado a{" "}
            <strong>apenas uma</strong> organização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inboundPhonesLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Carregando…</p>
          ) : null}
          {inboundPhonesError ? (
            <p className="text-sm text-[var(--color-destructive)]">{inboundPhonesError}</p>
          ) : null}
          {!inboundPhonesLoading && inboundPhones.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum telefone cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {inboundPhones.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-mono">{maskWhatsappBr(row.phoneDigits)}</span>
                    {row.label ? (
                      <span className="ml-2 text-[var(--color-muted-foreground)]">
                        ({row.label})
                      </span>
                    ) : null}
                  </div>
                  {canEditWhatsappPhones ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[var(--color-destructive)]"
                      onClick={() => void handleRemoveInboundPhone(row.id)}
                    >
                      Remover
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {canEditWhatsappPhones ? (
            <form
              onSubmit={handleAddInboundPhone}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start"
            >
              <div className="min-w-[200px] flex-1">
                <Input
                  type="tel"
                  label="Telefone do vendedor (com DDD)"
                  inputMode="tel"
                  autoComplete="tel"
                  value={newInboundPhone}
                  onChange={(e) => setNewInboundPhone(maskWhatsappBr(e.target.value))}
                  placeholder="(11) 98765-4321"
                  disabled={inboundSaving}
                  helperText="Pode informar com ou sem +55: salvamos só DDD + número. Móvel com ou sem o 9 após o DDD é tratado como o mesmo número."
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <Input
                  label="Rótulo (opcional)"
                  value={newInboundLabel}
                  onChange={(e) => setNewInboundLabel(e.target.value)}
                  placeholder="Ex.: Comercial SP"
                  disabled={inboundSaving}
                />
              </div>
              <Button
                type="submit"
                disabled={inboundSaving || digitsOnly(newInboundPhone).length < 10}
              >
                {inboundSaving ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Apenas proprietários e administradores podem alterar esta lista.
            </p>
          )}
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
