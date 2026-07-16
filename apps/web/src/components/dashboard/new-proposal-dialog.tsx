"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { FileText, Loader2, Search, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  useProposalStudy,
  buildDealFromLeadDetail,
} from "@/components/pipeline/proposal-study-provider";
import { createDeal, createLead, getLead, listLeads, type LeadListItem } from "@/lib/leads-api";
import { digitsOnly } from "@energivia/utils";

interface NewProposalDialogProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "existing" | "new";

function isValidWhatsapp(v: string): boolean {
  const d = digitsOnly(v);
  return d.length >= 10 && d.length <= 13;
}

function maskWhatsapp(value: string): string {
  const d = digitsOnly(value).slice(0, 13);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return `+${d.slice(0, d.length - 11)} (${d.slice(-11, -9)}) ${d.slice(-9, -4)}-${d.slice(-4)}`;
}

function formatLeadOption(lead: LeadListItem): string {
  const phone = lead.whatsapp ? maskWhatsapp(lead.whatsapp) : "";
  return phone ? `${lead.name} · ${phone}` : lead.name;
}

export function NewProposalDialog({ open, onClose }: NewProposalDialogProps): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const { openStudyForDeal } = useProposalStudy();
  const [mode, setMode] = useState<Mode>("existing");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<LeadListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setMode("existing");
      setName("");
      setWhatsapp("");
      setError(null);
      setSubmitting(false);
      setSearchInput("");
      setDebouncedSearch("");
      setSearchResults([]);
      setSelectedLead(null);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput.trim()), 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!open || !currentOrganizationId || mode !== "existing") return;
    let cancelled = false;
    setSearchLoading(true);
    listLeads(currentOrganizationId, { page: 1, pageSize: 12, search: debouncedSearch })
      .then((res) => {
        if (cancelled) return;
        setSearchResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentOrganizationId, debouncedSearch, mode]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (mode === "existing") return Boolean(selectedLead);
    return name.trim().length >= 2 && isValidWhatsapp(whatsapp);
  }, [submitting, mode, selectedLead, name, whatsapp]);

  async function handleSubmit() {
    if (!currentOrganizationId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let leadId: string;
      if (mode === "existing" && selectedLead) {
        leadId = selectedLead.id;
      } else {
        const created = await createLead(currentOrganizationId, {
          name: name.trim(),
          whatsapp: digitsOnly(whatsapp),
          source: "Painel · Nova proposta",
        });
        await createDeal(currentOrganizationId, created.id, {
          title: `Estudo solar — ${name.trim()}`,
          stage: "NEW",
        });
        leadId = created.id;
      }

      const detail = await getLead(currentOrganizationId, leadId);
      if (mode === "existing" && detail.deals.length === 0) {
        await createDeal(currentOrganizationId, leadId, {
          title: `Estudo solar — ${detail.name}`,
          stage: "NEW",
        });
      }
      const refreshed =
        mode === "existing" && detail.deals.length === 0
          ? await getLead(currentOrganizationId, leadId)
          : detail;
      const deal = buildDealFromLeadDetail(refreshed);
      onClose();
      setTimeout(() => {
        void openStudyForDeal(deal, { forceStudyModal: true });
      }, 30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a proposta.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !submitting) onClose();
      }}
    >
      <DialogContent muiMaxWidth="sm" className="overflow-hidden rounded-2xl p-0">
        <DialogHeader className="space-y-1 border-b border-[var(--color-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <FileText className="h-5 w-5 text-[var(--color-primary)]" />
            Nova proposta
          </DialogTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Escolha o cliente para iniciar a simulação. Em seguida você envia a fatura ou informa o
            consumo manualmente.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {}
          <div
            role="tablist"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "existing"}
              onClick={() => {
                setMode("existing");
                setError(null);
              }}
              disabled={submitting}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "existing"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md ring-1 ring-[var(--color-primary)]/40"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
              }`}
            >
              <Search className="h-4 w-4" />
              Cliente existente
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "new"}
              onClick={() => {
                setMode("new");
                setError(null);
              }}
              disabled={submitting}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "new"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md ring-1 ring-[var(--color-primary)]/40"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Novo cliente
            </button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-1.5">
              <Label>Buscar cliente</Label>
              <Autocomplete
                options={searchResults}
                value={selectedLead}
                onChange={(_, value) => setSelectedLead(value)}
                inputValue={searchInput}
                onInputChange={(_, value, reason) => {
                  if (reason !== "reset") setSearchInput(value);
                }}
                getOptionLabel={formatLeadOption}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                loading={searchLoading}
                disabled={submitting}
                noOptionsText={
                  debouncedSearch
                    ? "Nenhum cliente encontrado. Crie um novo na aba ao lado."
                    : "Comece a digitar o nome ou WhatsApp..."
                }
                slotProps={{ popper: { style: { zIndex: 2000 } } }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{option.name}</span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        {option.whatsapp ? maskWhatsapp(option.whatsapp) : "Sem WhatsApp"}
                        {option.company ? ` · ${option.company}` : ""}
                      </span>
                    </div>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Nome, WhatsApp, e-mail..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchLoading ? <CircularProgress size={16} color="inherit" /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                A simulação será vinculada ao cliente selecionado.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="new-proposal-name">Nome do cliente</Label>
                <Input
                  id="new-proposal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Família Silva, Padaria Trigo Real"
                  disabled={submitting}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-proposal-whatsapp">WhatsApp</Label>
                <Input
                  id="new-proposal-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
                  placeholder="(11) 90000-0000"
                  inputMode="tel"
                  disabled={submitting}
                />
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  DDD + número. O cliente será criado automaticamente como lead.
                </p>
              </div>
            </>
          )}

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "existing" ? "Abrindo..." : "Criando lead..."}
              </span>
            ) : (
              "Continuar para simulação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
