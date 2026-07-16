"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { maskWhatsappBr } from "@energivia/utils";

type ExistingClient = {
  id: string;
  name: string;
  contact: string;
  whatsapp: string | null;
};

type ClientOption =
  | { kind: "create"; id: "__create__"; label: string }
  | ({ kind: "client" } & ExistingClient);

type CreatePayload = {
  mode: "existing" | "new";
  leadId?: string;
  clientName: string;
  whatsapp?: string;
  email?: string;
  dealName?: string;
  value?: number;
  assigneeUserId?: string;
};

type AssigneeOption = {
  userId: string;
  name: string;
  subtitle?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ExistingClient[];
  assignees: AssigneeOption[];
  onCreateDeal: (payload: CreatePayload) => Promise<void>;
};

export function CreateDealModal({
  open,
  onOpenChange,
  clients,
  assignees,
  onCreateDeal,
}: Props): JSX.Element {
  const clientInputRef = useRef<HTMLInputElement>(null);
  const newClientNameInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchingClients, setSearchingClients] = useState(false);
  const [dealName, setDealName] = useState("");
  const [valueInput, setValueInput] = useState<number | null>(null);
  const [createNewClient, setCreateNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientWhatsapp, setNewClientWhatsapp] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => clientInputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !createNewClient) return;
    const t = window.setTimeout(() => newClientNameInputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, createNewClient]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedClientId("");
      setDealName("");
      setValueInput(null);
      setCreateNewClient(false);
      setNewClientName("");
      setNewClientWhatsapp("");
      setNewClientEmail("");
      setSelectedAssigneeUserId("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setDebouncedQuery("");
      setSearchingClients(false);
      return;
    }
    setSearchingClients(true);
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      setSearchingClients(false);
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, query]);

  const filteredClients = useMemo(() => {
    if (!debouncedQuery) return [] as ExistingClient[];
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(debouncedQuery) ||
          c.contact.toLowerCase().includes(debouncedQuery)
      )
      .slice(0, 8);
  }, [clients, debouncedQuery]);

  const comboOptions = useMemo<ClientOption[]>(() => {
    if (!query.trim()) {
      return [{ kind: "create", id: "__create__", label: "Criar novo cliente" }];
    }
    return [
      { kind: "create", id: "__create__", label: "Criar novo cliente" },
      ...filteredClients.map((c) => ({ ...c, kind: "client" as const })),
    ];
  }, [filteredClients, query]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  function activateCreateNewClient(prefillName?: string): void {
    setCreateNewClient(true);
    setNewClientName((prefillName ?? query).trim());
    setSelectedClientId("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const parsedValue = valueInput ?? undefined;

    if (createNewClient) {
      const name = newClientName.trim();
      const whatsapp = newClientWhatsapp.replace(/\D/g, "");
      if (name.length < 2) {
        setError("Informe o nome do cliente.");
        return;
      }
      if (whatsapp.length < 10 || whatsapp.length > 13) {
        setError("Informe WhatsApp com DDD (10 a 13 dígitos).");
        return;
      }
      setLoading(true);
      try {
        await onCreateDeal({
          mode: "new",
          clientName: name,
          whatsapp: whatsapp,
          email: newClientEmail.trim() || undefined,
          dealName: dealName.trim() || undefined,
          value: Number.isFinite(parsedValue ?? 0) ? parsedValue : undefined,
          assigneeUserId: selectedAssigneeUserId || undefined,
        });
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedClient) {
      setError("Selecione um cliente para continuar.");
      return;
    }

    setLoading(true);
    try {
      await onCreateDeal({
        mode: "existing",
        leadId: selectedClient.id,
        clientName: selectedClient.name,
        dealName: dealName.trim() || undefined,
        value: Number.isFinite(parsedValue ?? 0) ? parsedValue : undefined,
        assigneeUserId: selectedAssigneeUserId || undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova negociação</DialogTitle>
          <DialogDescription>
            Comece em segundos: escolha um cliente ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-1 pb-1 pt-1">
          {!createNewClient ? (
            <Autocomplete
              options={comboOptions}
              filterOptions={(options) => options}
              disablePortal
              value={
                selectedClient ? ({ ...selectedClient, kind: "client" } as ClientOption) : null
              }
              onChange={(_, value) => {
                if (!value) {
                  setSelectedClientId("");
                  return;
                }
                if (value.kind === "create") {
                  activateCreateNewClient(query);
                  return;
                }
                setCreateNewClient(false);
                setSelectedClientId(value.id);
                setError(null);
              }}
              inputValue={query}
              onInputChange={(_, value) => {
                setQuery(value);
                if (!value.trim()) {
                  setSelectedClientId("");
                }
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => (option.kind === "create" ? option.label : option.name)}
              noOptionsText="Nenhum cliente encontrado."
              loading={searchingClients}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.kind === "create" ? (
                    <p className="py-1 text-sm font-medium text-[var(--color-primary)]">
                      + {option.label}
                    </p>
                  ) : (
                    <div className="py-1">
                      <p className="font-medium">{option.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {option.contact}
                      </p>
                    </div>
                  )}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Cliente (obrigatório)"
                  inputRef={clientInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!selectedClient && !createNewClient && query.trim()) {
                        activateCreateNewClient(query);
                        return;
                      }
                      void handleSubmit();
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchingClients ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          ) : null}

          {createNewClient ? (
            <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-3">
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                onClick={() => {
                  setCreateNewClient(false);
                  setError(null);
                }}
              >
                Usar cliente existente
              </button>
              <Input
                ref={newClientNameInputRef}
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nome (obrigatório)"
              />
              <Input
                value={newClientWhatsapp}
                onChange={(e) => setNewClientWhatsapp(maskWhatsappBr(e.target.value))}
                placeholder="(41) 99999-9999 ou +55 (41) 99999-9999"
                inputMode="tel"
              />
              <Input
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="E-mail (opcional)"
                type="email"
                inputMode="email"
              />
            </div>
          ) : null}

          <Input
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="Ex: Sistema solar residencial"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <CurrencyInput
            value={valueInput}
            onValueChange={setValueInput}
            placeholder="Valor estimado"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <Autocomplete
            options={assignees}
            disablePortal
            value={assignees.find((a) => a.userId === selectedAssigneeUserId) ?? null}
            onChange={(_, value) => setSelectedAssigneeUserId(value?.userId ?? "")}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            getOptionLabel={(option) => option.name}
            noOptionsText="Nenhum usuário disponível."
            renderOption={(props, option) => (
              <li {...props} key={option.userId}>
                <div className="py-1">
                  <p className="font-medium">{option.name}</p>
                  {option.subtitle ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {option.subtitle}
                    </p>
                  ) : null}
                </div>
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder="Responsável (opcional)" label="Responsável" />
            )}
          />

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading}>
            {loading
              ? "Criando..."
              : createNewClient
                ? "Criar cliente e negociação"
                : "Criar negociação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
