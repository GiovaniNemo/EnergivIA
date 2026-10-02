"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Target,
  MessageSquareText,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { convertRadarToLead } from "@/lib/radar-api";
import { useOrganization } from "@/components/providers/organization-provider";

interface RadarLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  installation: {
    id: string;
    codeAneel: string;
    uf: string;
    city: string;
    neighborhood: string;
    addressMasked: string;
    powerKwp: number;
    yearsConnected: number;
    opportunityType: string;
    recommendedPitch: string;
  } | null;
  onSuccess?: () => void;
}

function cleanText(str?: string | null): string {
  if (!str) return "";
  try {
    if (/[\u00C2\u00C3]/.test(str)) {
      return Buffer.from(str, "binary").toString("utf-8");
    }
  } catch {
    // fallback
  }
  return str;
}

export function RadarLeadModal({ isOpen, onClose, installation, onSuccess }: RadarLeadModalProps) {
  const { currentOrganization } = useOrganization();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (installation) {
      const cleanNeighborhood = cleanText(installation.neighborhood);
      const cleanCity = cleanText(installation.city);
      setName(`Prospecção - ${cleanNeighborhood || cleanCity}`);
      setNotes(cleanText(installation.recommendedPitch));
      setWhatsapp("");
      setShowPhoneInput(false);
      setSuccess(false);
    }
  }, [installation]);

  if (!installation) return null;

  const cleanNeighborhood = cleanText(installation.neighborhood);
  const cleanCity = cleanText(installation.city);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await convertRadarToLead(
        {
          installationId: installation.codeAneel || installation.id,
          name: name.trim(),
          whatsapp: whatsapp.trim() || undefined,
          neighborhood: cleanNeighborhood,
          city: cleanCity,
          uf: installation.uf,
          systemPowerKwp: `${installation.powerKwp} kWp`,
          notes: `${notes}\n\nCódigo ANEEL: ${installation.codeAneel} (${installation.yearsConnected} anos de conexão)`,
        },
        currentOrganization?.id
      );

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Erro ao converter lead.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-white dark:bg-neutral-900 text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <Target className="w-4 h-4" />
            <span>Prospecção Territorial Radar</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Salvar Alvo no Funil de Vendas
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Alvo Adicionado ao Pipeline!
            </h4>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              A oportunidade foi inserida no CRM com os dados de inteligência da região.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Aviso de conformidade LGPD / Dados ANEEL */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Dados da ANEEL são públicos e regulados pela LGPD (não incluem telefone ou contato
                pessoal). Este registro será salvo como <strong>alvo territorial no bairro</strong>{" "}
                para prospecção de vizinhança ou abordagem comercial em campo.
              </p>
            </div>

            {/* Card com dados da Usina */}
            <div className="bg-slate-50 dark:bg-neutral-950/80 rounded-xl p-3.5 border border-slate-200 dark:border-neutral-800/80 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  {cleanNeighborhood}, {cleanCity} - {installation.uf}
                </span>
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                  {installation.powerKwp} kWp
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>
                  ANEEL: {installation.codeAneel} • Conectado há {installation.yearsConnected} anos
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                Identificação do Alvo / Oportunidade
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prospecção - Alto da Lapa"
                required
                className="bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:border-amber-500"
              />
            </div>

            {/* Campo Opcional de Contato / Telefone recolhido por padrão */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowPhoneInput(!showPhoneInput)}
                className="flex items-center justify-between w-full text-left text-xs font-medium text-slate-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>Possui telefone obtido em campo? (Opcional)</span>
                </span>
                {showPhoneInput ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showPhoneInput && (
                <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: 11999998888 (opcional)"
                    className="bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:border-amber-500 text-xs h-9"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Você também pode adicionar o contato depois diretamente pelo CRM após a visita.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                <MessageSquareText className="w-3.5 h-3.5 text-amber-500" />
                Inteligência & Roteiro de Abordagem Territorial
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 p-2 text-xs text-slate-900 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
              >
                {loading ? "Salvando Alvo..." : "Salvar no Funil Comercial"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
