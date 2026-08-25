"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  addWhatsappInboundPhone,
  generateWhatsappPairingCode,
  listWhatsappInboundPhones,
  removeWhatsappInboundPhone,
  type WhatsappInboundPhoneRow,
  type WhatsappPairingCodeResponse,
} from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { digitsOnly, maskWhatsappBr } from "@energivia/utils";
import { MessageSquare, ShieldCheck, RefreshCw, Send, Trash2, PhoneCall } from "lucide-react";

interface WhatsappConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsappConnectionModal({ open, onOpenChange }: WhatsappConnectionModalProps) {
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const [inboundPhones, setInboundPhones] = useState<WhatsappInboundPhoneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInboundPhone, setNewInboundPhone] = useState("");
  const [newInboundLabel, setNewInboundLabel] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<WhatsappPairingCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  const canEdit =
    currentOrganization?.role === "OWNER" ||
    currentOrganization?.role === "ADMIN" ||
    currentOrganization?.role === "SALES" ||
    currentOrganization?.role === "ENGINEER";

  // Load phones when open
  useEffect(() => {
    if (!open || !currentOrganizationId) return;
    loadPhones();
  }, [open, currentOrganizationId]);

  const loadPhones = async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listWhatsappInboundPhones(currentOrganizationId);
      setInboundPhones(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar telefones.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!currentOrganizationId) return;
    setPairingLoading(true);
    setError(null);
    try {
      const res = await generateWhatsappPairingCode(currentOrganizationId);
      setPairingInfo(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar código.");
    } finally {
      setPairingLoading(false);
    }
  };

  // Polling code status
  useEffect(() => {
    if (!pairingInfo || !currentOrganizationId || !open) return;
    const initialCount = inboundPhones.length;
    const interval = setInterval(async () => {
      try {
        const rows = await listWhatsappInboundPhones(currentOrganizationId);
        setInboundPhones(rows);
        if (rows.length > initialCount) {
          setPairingInfo(null); // Linked!
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pairingInfo, currentOrganizationId, inboundPhones.length, open]);

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId || !newInboundPhone.trim()) return;
    setError(null);
    setSavingManual(true);
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
      setError(err instanceof Error ? err.message : "Falha ao adicionar número.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleRemovePhone = async (phoneId: string) => {
    if (!currentOrganizationId) return;
    setError(null);
    try {
      await removeWhatsappInboundPhone(currentOrganizationId, phoneId);
      setInboundPhones((prev) => prev.filter((p) => p.id !== phoneId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.");
    }
  };

  const [customWaLogoUrl, setCustomWaLogoUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/system/branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.whatsappLogoUrl) {
          setCustomWaLogoUrl(data.whatsappLogoUrl);
        }
      })
      .catch(() => {});
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-auto max-h-[90vh] rounded-2xl p-6 scrollbar-thin">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {customWaLogoUrl ? (
              <img
                src={customWaLogoUrl}
                alt="WhatsApp"
                className="h-5.5 w-5.5 shrink-0 object-contain rounded-sm"
              />
            ) : (
              <MessageSquare className="h-5.5 w-5.5" />
            )}
            IA no WhatsApp
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-muted-foreground)]">
            Vincule o WhatsApp da sua equipe para gerar dimensionamentos de kits solares, calcular
            economia e enviar propostas comerciais automáticas diretamente do chat.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* Pairing Code Section */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4.5 dark:bg-emerald-950/15">
            <div className="flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Conexão Rápida por Código
                </h4>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Gere um código de 6 dígitos e envie para o robô no WhatsApp para vincular seu
                  número na hora.
                </p>
              </div>

              {!pairingInfo ? (
                <Button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={pairingLoading || !canEdit}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/15"
                >
                  {pairingLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Gerando código...
                    </span>
                  ) : (
                    "📲 Conectar meu WhatsApp"
                  )}
                </Button>
              ) : (
                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-white/70 p-4 text-center dark:bg-black/30">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Envie a mensagem abaixo para o número{" "}
                    <strong className="font-mono">{pairingInfo.botNumber}</strong>:
                  </p>
                  <div className="my-3 select-all rounded-lg bg-emerald-50 py-2.5 font-mono text-3xl font-black tracking-widest text-emerald-700 shadow-inner dark:bg-emerald-950/40 dark:text-emerald-300">
                    {pairingInfo.formattedMessage}
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      href={pairingInfo.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Abrir WhatsApp e Enviar Código
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium"
                      onClick={() => setPairingInfo(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <p className="mt-2.5 text-[10px] text-[var(--color-muted-foreground)]">
                    ⏳ O código expira em 15 minutos. Esta tela fechará o código quando o robô
                    confirmar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Connected Numbers List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              Números Autorizados ({inboundPhones.length})
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
              </div>
            ) : inboundPhones.length === 0 ? (
              <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4 bg-[var(--color-muted)]/30 rounded-xl">
                Nenhum número de WhatsApp vinculado a esta organização.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-card)]">
                {inboundPhones.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-mono font-semibold text-[var(--color-foreground)] truncate">
                        {maskWhatsappBr(row.phoneDigits)}
                      </span>
                      {row.label ? (
                        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)] truncate">
                          {row.label}
                        </span>
                      ) : null}
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] rounded-lg shrink-0"
                        onClick={() => void handleRemovePhone(row.id)}
                        title="Desvincular número"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Manual addition (collapsible) */}
          {canEdit && (
            <details className="group border-t border-[var(--color-border)] pt-4">
              <summary className="flex items-center justify-between cursor-pointer font-medium text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors select-none">
                <span>➕ Adicionar número manualmente</span>
              </summary>
              <form onSubmit={handleAddManual} className="mt-3.5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    type="tel"
                    label="Telefone com DDD"
                    inputMode="tel"
                    autoComplete="tel"
                    value={newInboundPhone}
                    onChange={(e) => setNewInboundPhone(maskWhatsappBr(e.target.value))}
                    placeholder="(44) 99158-5309"
                    disabled={savingManual}
                    className="h-9.5"
                  />
                  <Input
                    label="Nome / Rótulo"
                    value={newInboundLabel}
                    onChange={(e) => setNewInboundLabel(e.target.value)}
                    placeholder="Ex.: Vendedor João"
                    disabled={savingManual}
                    className="h-9.5"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingManual || digitsOnly(newInboundPhone).length < 10}
                  className="w-full text-xs font-semibold"
                >
                  {savingManual ? "Salvando..." : "Adicionar número"}
                </Button>
              </form>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
