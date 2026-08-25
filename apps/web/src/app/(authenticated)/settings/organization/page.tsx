"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { updateOrganization, uploadOrganizationLogo } from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setCnpj(currentOrganization.cnpj ?? "");
      setLogoUrl(currentOrganization.logoUrl ?? "");
    }
  }, [currentOrganization]);

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
