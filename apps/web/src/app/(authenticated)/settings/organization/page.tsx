"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { updateOrganization, uploadOrganizationLogo } from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Loader2, Search, CheckCircle2, Plus, Building2, Sparkles } from "lucide-react";
import Link from "next/link";

interface CnpjApiResponse {
  razao_social?: string;
  nome_fantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

function titleCase(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (
        ["de", "da", "do", "das", "dos", "e", "em", "para", "ltda", "sa", "me", "epp"].includes(
          word
        )
      ) {
        return word === "ltda" || word === "sa" || word === "me" || word === "epp"
          ? word.toUpperCase()
          : word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

async function fetchCnpjDetails(cleanCnpj: string): Promise<CnpjApiResponse> {
  if (cleanCnpj.length !== 14) {
    throw new Error("CNPJ deve conter 14 dígitos.");
  }

  // 1. Try BrasilAPI first
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      return {
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        cep: data.cep || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
      };
    }
  } catch {}

  // 2. Fallback to Minha Receita
  try {
    const res = await fetch(`https://minhareceita.org/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      return {
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        cep: data.cep || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
      };
    }
  } catch {}

  throw new Error("CNPJ não encontrado ou serviço temporariamente indisponível.");
}

function OrganizationSettingsContent() {
  const {
    organizations,
    currentOrganization,
    currentOrganizationId,
    setCurrentOrganizationId,
    createOrg,
    refetch,
  } = useOrganization();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active organization edit form state
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [cnpjAutofillInfo, setCnpjAutofillInfo] = useState<string | null>(null);

  const lastSearchedCnpj = useRef<string>("");
  const lastSearchedCep = useRef<string>("");
  const numberInputRef = useRef<HTMLInputElement>(null);

  // New organization modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCnpj, setNewOrgCnpj] = useState("");
  const [newOrgLogoUrl, setNewOrgLogoUrl] = useState("");
  const [newOrgCep, setNewOrgCep] = useState("");
  const [newOrgStreet, setNewOrgStreet] = useState("");
  const [newOrgNumber, setNewOrgNumber] = useState("");
  const [newOrgComplement, setNewOrgComplement] = useState("");
  const [newOrgNeighborhood, setNewOrgNeighborhood] = useState("");
  const [newOrgCity, setNewOrgCity] = useState("");
  const [newOrgState, setNewOrgState] = useState("");

  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isNewOrgSearchingCnpj, setIsNewOrgSearchingCnpj] = useState(false);
  const [isNewOrgSearchingCep, setIsNewOrgSearchingCep] = useState(false);
  const [isUploadingNewOrgLogo, setIsUploadingNewOrgLogo] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [createModalLogoError, setCreateModalLogoError] = useState<string | null>(null);
  const [createdSuccessMessage, setCreatedSuccessMessage] = useState<string | null>(null);

  const newOrgLastSearchedCnpj = useRef<string>("");
  const newOrgLastSearchedCep = useRef<string>("");
  const newOrgNumberInputRef = useRef<HTMLInputElement>(null);

  // Auto-open create modal if navigated with ?action=new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsCreateModalOpen(true);
      router.replace("/configuracoes/organizacao");
    }
  }, [searchParams, router]);

  // Sync current organization details to form
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
      setSaved(false);
      setError(null);
      setCnpjAutofillInfo(null);
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

  const handleFetchCnpj = async (cleanCnpj: string, isModal = false) => {
    if (cleanCnpj.length !== 14) return;
    if (isModal) {
      setIsNewOrgSearchingCnpj(true);
      setCreateModalError(null);
    } else {
      setIsSearchingCnpj(true);
      setError(null);
      setCnpjAutofillInfo(null);
    }

    try {
      const data = await fetchCnpjDetails(cleanCnpj);
      const companyName = data.nome_fantasia || data.razao_social || "";
      const formattedCep = formatCep(data.cep || "");

      if (isModal) {
        if (companyName && !newOrgName) {
          setNewOrgName(titleCase(companyName));
        } else if (companyName) {
          setNewOrgName((prev) => prev || titleCase(companyName));
        }
        if (formattedCep) setNewOrgCep(formattedCep);
        if (data.logradouro) setNewOrgStreet(titleCase(data.logradouro));
        if (data.numero) setNewOrgNumber(data.numero);
        if (data.complemento) setNewOrgComplement(titleCase(data.complemento));
        if (data.bairro) setNewOrgNeighborhood(titleCase(data.bairro));
        if (data.municipio) setNewOrgCity(titleCase(data.municipio));
        if (data.uf) setNewOrgState(data.uf.toUpperCase());
        setTimeout(() => newOrgNumberInputRef.current?.focus(), 100);
      } else {
        if (companyName && (!name || name === "Organização")) {
          setName(titleCase(companyName));
        }
        if (formattedCep) setCep(formattedCep);
        if (data.logradouro) setStreet(titleCase(data.logradouro));
        if (data.numero) setNumber(data.numero);
        if (data.complemento) setComplement(titleCase(data.complemento));
        if (data.bairro) setNeighborhood(titleCase(data.bairro));
        if (data.municipio) setCity(titleCase(data.municipio));
        if (data.uf) setState(data.uf.toUpperCase());
        setCnpjAutofillInfo("Dados da empresa e endereço preenchidos via CNPJ!");
        setTimeout(() => numberInputRef.current?.focus(), 100);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar CNPJ.";
      if (isModal) setCreateModalError(msg);
      else setError(msg);
    } finally {
      if (isModal) setIsNewOrgSearchingCnpj(false);
      else setIsSearchingCnpj(false);
    }
  };

  const handleCnpjChange = (rawValue: string, isModal = false) => {
    const formatted = formatCnpj(rawValue);
    const clean = rawValue.replace(/\D/g, "");

    if (isModal) {
      setNewOrgCnpj(formatted);
      if (clean.length === 14 && clean !== newOrgLastSearchedCnpj.current) {
        newOrgLastSearchedCnpj.current = clean;
        handleFetchCnpj(clean, true);
      }
    } else {
      setCnpj(formatted);
      if (clean.length === 14 && clean !== lastSearchedCnpj.current) {
        lastSearchedCnpj.current = clean;
        handleFetchCnpj(clean, false);
      }
    }
  };

  const fetchViaCep = async (cleanCep: string, isModal = false) => {
    if (cleanCep.length !== 8) return;
    if (isModal) {
      setIsNewOrgSearchingCep(true);
      setCreateModalError(null);
    } else {
      setIsSearchingCep(true);
      setError(null);
    }

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (data.erro) {
          const msg = "CEP não encontrado.";
          if (isModal) setCreateModalError(msg);
          else setError(msg);
        } else {
          if (isModal) {
            setNewOrgStreet(data.logradouro || "");
            setNewOrgNeighborhood(data.bairro || "");
            setNewOrgCity(data.localidade || "");
            setNewOrgState(data.uf || "");
            setTimeout(() => {
              newOrgNumberInputRef.current?.focus();
            }, 100);
          } else {
            setStreet(data.logradouro || "");
            setNeighborhood(data.bairro || "");
            setCity(data.localidade || "");
            setState(data.uf || "");
            setTimeout(() => {
              numberInputRef.current?.focus();
            }, 100);
          }
        }
      } else {
        const msg = "Erro ao buscar CEP.";
        if (isModal) setCreateModalError(msg);
        else setError(msg);
      }
    } catch {
      const msg = "Falha na conexão com o serviço de CEP.";
      if (isModal) setCreateModalError(msg);
      else setError(msg);
    } finally {
      if (isModal) setIsNewOrgSearchingCep(false);
      else setIsSearchingCep(false);
    }
  };

  const handleCepChange = (rawValue: string, isModal = false) => {
    const formatted = formatCep(rawValue);
    const clean = rawValue.replace(/\D/g, "");

    if (isModal) {
      setNewOrgCep(formatted);
      if (clean.length === 8 && clean !== newOrgLastSearchedCep.current) {
        newOrgLastSearchedCep.current = clean;
        fetchViaCep(clean, true);
      }
    } else {
      setCep(formatted);
      if (clean.length === 8 && clean !== lastSearchedCep.current) {
        lastSearchedCep.current = clean;
        fetchViaCep(clean, false);
      }
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

  const handleLogoUpload = async (file: File, isModal = false) => {
    if (isModal) {
      setCreateModalLogoError(null);
      setIsUploadingNewOrgLogo(true);
    } else {
      setLogoError(null);
      setIsUploadingLogo(true);
    }

    try {
      const uploadedLogoUrl = await uploadOrganizationLogo(file);
      if (isModal) setNewOrgLogoUrl(uploadedLogoUrl);
      else setLogoUrl(uploadedLogoUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar logo da empresa";
      if (isModal) setCreateModalLogoError(msg);
      else setLogoError(msg);
    } finally {
      if (isModal) setIsUploadingNewOrgLogo(false);
      else setIsUploadingLogo(false);
    }
  };

  const resetCreateModal = () => {
    setNewOrgName("");
    setNewOrgCnpj("");
    setNewOrgLogoUrl("");
    setNewOrgCep("");
    setNewOrgStreet("");
    setNewOrgNumber("");
    setNewOrgComplement("");
    setNewOrgNeighborhood("");
    setNewOrgCity("");
    setNewOrgState("");
    setCreateModalError(null);
    setCreateModalLogoError(null);
    newOrgLastSearchedCnpj.current = "";
    newOrgLastSearchedCep.current = "";
  };

  const handleCreateOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setCreateModalError("Informe o nome da organização.");
      return;
    }

    setIsCreatingOrg(true);
    setCreateModalError(null);
    try {
      const created = await createOrg({
        name: newOrgName.trim(),
        cnpj: newOrgCnpj.trim() || undefined,
        logoUrl: newOrgLogoUrl.trim() || undefined,
        cep: newOrgCep.trim() || undefined,
        street: newOrgStreet.trim() || undefined,
        number: newOrgNumber.trim() || undefined,
        complement: newOrgComplement.trim() || undefined,
        neighborhood: newOrgNeighborhood.trim() || undefined,
        city: newOrgCity.trim() || undefined,
        state: newOrgState.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      resetCreateModal();
      setCreatedSuccessMessage(`Organização "${created.name}" cadastrada com sucesso!`);
      setTimeout(() => setCreatedSuccessMessage(null), 6000);
    } catch (e) {
      setCreateModalError(e instanceof Error ? e.message : "Falha ao cadastrar nova organização.");
    } finally {
      setIsCreatingOrg(false);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-muted-foreground)]">Nenhuma organização encontrada.</p>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header with Title and Create New Org Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organização</h1>
          <p className="text-[var(--color-muted-foreground)]">
            Nome, CNPJ, localização e logotipo da sua empresa no EnergivIA.
          </p>
        </div>
        <Button
          onClick={() => {
            resetCreateModal();
            setIsCreateModalOpen(true);
          }}
          className="shrink-0 gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Nova Empresa
        </Button>
      </div>

      {/* Success notification banner */}
      {createdSuccessMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{createdSuccessMessage}</span>
        </div>
      )}

      {/* Switcher bar if user belongs to multiple organizations */}
      {organizations.length > 1 && (
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]/50 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Organização Selecionada
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {organizations.map((org) => {
                const isActive = org.id === currentOrganizationId;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => setCurrentOrganizationId(org.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[160px] truncate">{org.name}</span>
                    {isActive && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação da empresa</CardTitle>
            <CardDescription>
              Estes dados identificam sua empresa nas propostas. Digite o CNPJ para preenchimento
              automático.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                onChange={(e) => handleCnpjChange(e.target.value, false)}
                placeholder="00.000.000/0000-00"
                className="font-mono"
                endAdornment={
                  isSearchingCnpj ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFetchCnpj(cnpj.replace(/\D/g, ""), false)}
                      title="Consultar dados da empresa pelo CNPJ"
                      className="p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )
                }
              />
            </div>

            {cnpjAutofillInfo && (
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{cnpjAutofillInfo}</span>
              </div>
            )}

            <ImageDropzone
              label="Logo da empresa (opcional)"
              value={logoUrl}
              onSelectFile={(f) => handleLogoUpload(f, false)}
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
                Endereço e sede da sua empresa para exibição em contratos e propostas comerciais.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="CEP"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value, false)}
                placeholder="00000-000"
                className="font-mono"
                endAdornment={
                  isSearchingCep ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchViaCep(cep.replace(/\D/g, ""), false)}
                      title="Buscar CEP"
                      className="p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )
                }
              />

              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Av. Paulista"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-accent)]/30 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
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
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
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

      {/* Modal: Cadastrar Nova Empresa */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (!isCreatingOrg) {
            setIsCreateModalOpen(open);
            if (!open) resetCreateModal();
          }
        }}
      >
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
              Cadastrar Nova Empresa
            </DialogTitle>
            <DialogDescription>
              Informe o CNPJ para preencher os dados da nova organização automaticamente ou informe
              manualmente abaixo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrganizationSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="CNPJ (preenchimento automático)"
                value={newOrgCnpj}
                onChange={(e) => handleCnpjChange(e.target.value, true)}
                placeholder="00.000.000/0000-00"
                className="font-mono"
                autoFocus
                endAdornment={
                  isNewOrgSearchingCnpj ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFetchCnpj(newOrgCnpj.replace(/\D/g, ""), true)}
                      title="Consultar CNPJ"
                      className="p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )
                }
              />
              <Input
                label="Nome da organização *"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Ex: Minha Nova Empresa Solar"
                required
              />
            </div>

            <ImageDropzone
              label="Logo da empresa (opcional)"
              value={newOrgLogoUrl}
              onSelectFile={(f) => handleLogoUpload(f, true)}
              onClear={() => setNewOrgLogoUrl("")}
              isUploading={isUploadingNewOrgLogo}
              disabled={isCreatingOrg || isUploadingNewOrgLogo}
              accept="image/jpeg,image/png,image/webp"
              helperText="Formatos aceitos: JPG, PNG, WEBP."
              errorMessage={createModalLogoError}
            />

            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Localização e Endereço (opcional)
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="CEP"
                    value={newOrgCep}
                    onChange={(e) => handleCepChange(e.target.value, true)}
                    placeholder="00000-000"
                    className="font-mono"
                    endAdornment={
                      isNewOrgSearchingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => fetchViaCep(newOrgCep.replace(/\D/g, ""), true)}
                          title="Buscar CEP"
                          className="p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                      )
                    }
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Logradouro / Rua"
                      value={newOrgStreet}
                      onChange={(e) => setNewOrgStreet(e.target.value)}
                      placeholder="Ex: Av. Paulista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    ref={newOrgNumberInputRef}
                    label="Número"
                    value={newOrgNumber}
                    onChange={(e) => setNewOrgNumber(e.target.value)}
                    placeholder="Ex: 1000"
                  />
                  <Input
                    label="Complemento"
                    value={newOrgComplement}
                    onChange={(e) => setNewOrgComplement(e.target.value)}
                    placeholder="Ex: Sala 42"
                  />
                  <Input
                    label="Bairro"
                    value={newOrgNeighborhood}
                    onChange={(e) => setNewOrgNeighborhood(e.target.value)}
                    placeholder="Ex: Centro"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Cidade"
                      value={newOrgCity}
                      onChange={(e) => setNewOrgCity(e.target.value)}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <Input
                    label="Estado (UF)"
                    value={newOrgState}
                    onChange={(e) => setNewOrgState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="Ex: SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {createModalError && (
              <p className="text-sm text-[var(--color-destructive)] font-medium">
                {createModalError}
              </p>
            )}

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingOrg}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingOrg || !newOrgName.trim()}>
                {isCreatingOrg ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando…
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Empresa
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl py-12 text-center text-[var(--color-muted-foreground)]">
          Carregando organização…
        </div>
      }
    >
      <OrganizationSettingsContent />
    </Suspense>
  );
}
