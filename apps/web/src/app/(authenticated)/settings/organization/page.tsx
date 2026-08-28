"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { updateOrganization, uploadOrganizationLogo } from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function OrganizationSettingsPage() {
  const { currentOrganization, currentOrganizationId, refetch } = useOrganization();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Endereço e Localização
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const lastSearchedCep = useRef<string>("");
  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setCnpj(currentOrganization.cnpj ?? "");
      setLogoUrl(currentOrganization.logoUrl ?? "");
      setCep(currentOrganization.cep ?? "");
      setStreet(currentOrganization.street ?? "");
      setNumber(currentOrganization.number ?? "");
      setComplement(currentOrganization.complement ?? "");
      setNeighborhood(currentOrganization.neighborhood ?? "");
      setCity(currentOrganization.city ?? "");
      setState(currentOrganization.state ?? "");
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

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const fetchViaCep = async (cleanCep: string) => {
    if (cleanCep.length !== 8) return;
    setIsSearchingCep(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (data.erro) {
          setError("CEP não encontrado.");
        } else {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
          setTimeout(() => {
            numberInputRef.current?.focus();
          }, 100);
        }
      } else {
        setError("Erro ao buscar CEP no ViaCEP.");
      }
    } catch {
      setError("Falha na conexão com o serviço de CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (rawValue: string) => {
    const formatted = formatCep(rawValue);
    setCep(formatted);
    const clean = rawValue.replace(/\D/g, "");

    if (clean.length === 8 && clean !== lastSearchedCep.current) {
      lastSearchedCep.current = clean;
      fetchViaCep(clean);
    }
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
          cep: cep.trim() || undefined,
          street: street.trim() || undefined,
          number: number.trim() || undefined,
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
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

  const fullAddress = [
    street,
    number ? `nº ${number}` : "",
    complement,
    neighborhood,
    city && state ? `${city} - ${state}` : city || state,
    cep ? `CEP ${cep}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (!currentOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Selecione uma organização.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organização</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Nome, CNPJ, localização e logotipo da sua empresa no EnergivIA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação da empresa</CardTitle>
            <CardDescription>
              Estes dados identificam sua empresa e aparecem nas propostas geradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome da organização"
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
            </div>

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
          </CardContent>
        </Card>

        {/* Localização e Endereço */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
                Localização e Endereço
              </CardTitle>
              <CardDescription>
                Informe o CEP para preencher o endereço da sua sede automaticamente via ViaCEP.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <Input
                  label="CEP"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="font-mono pr-10"
                />
                <div className="absolute right-3 top-[34px] flex items-center">
                  {isSearchingCep ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchViaCep(cep.replace(/\D/g, ""))}
                      title="Buscar CEP"
                      className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Av. Paulista"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                ref={numberInputRef}
                label="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: 1000"
              />
              <Input
                label="Complemento (opcional)"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Ex: Sala 42, Bloco B"
              />
              <Input
                label="Bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Bela Vista"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                />
              </div>
              <Input
                label="Estado (UF)"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="Ex: SP"
                maxLength={2}
              />
            </div>

            {/* Preview de Localização */}
            {fullAddress && (
              <div className="mt-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-accent)]/30 flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Endereço Completo Cadastrado
                  </p>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {fullAddress}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Alterações salvas com sucesso!
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Salvar Alterações"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Equipe da organização</CardTitle>
          <CardDescription>
            Gerencie membros, permissões e convites para esta empresa.
          </CardDescription>
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
