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
import { Sparkles, CheckCircle2, User, Phone, MapPin, Zap } from "lucide-react";
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

export function RadarLeadModal({ isOpen, onClose, installation, onSuccess }: RadarLeadModalProps) {
  const { currentOrganization } = useOrganization();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (installation) {
      setName(`Prospect - ${installation.neighborhood || installation.city}`);
      setNotes(installation.recommendedPitch);
      setSuccess(false);
    }
  }, [installation]);

  if (!installation) return null;

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
          neighborhood: installation.neighborhood,
          city: installation.city,
          uf: installation.uf,
          systemPowerKwp: `${installation.powerKwp} kWp`,
          notes: `${notes}\n\nCódigo ANEEL: ${installation.codeAneel} (${installation.yearsConnected} anos conectado)`,
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
      <DialogContent className="sm:max-w-[520px] bg-[var(--color-surface,#18181b)] text-white border border-neutral-800 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>OPORTUNIDADE DE PROSPECÇÃO RADAR</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            Adicionar ao Funil de Vendas
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
            <h4 className="text-lg font-bold text-white">Lead & Oportunidade Criados!</h4>
            <p className="text-sm text-neutral-400">
              O lead foi inserido no seu pipeline comercial com os dados da usina.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Card com dados da Usina */}
            <div className="bg-neutral-900/80 rounded-xl p-3.5 border border-neutral-800/80 text-xs space-y-2">
              <div className="flex justify-between items-center text-neutral-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {installation.neighborhood}, {installation.city} - {installation.uf}
                </span>
                <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono font-semibold">
                  {installation.powerKwp} kWp
                </span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  ANEEL: {installation.codeAneel} • Conectado há {installation.yearsConnected} anos
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                Nome do Contato / Identificação
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos (Vizinho Usina #432)"
                required
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-neutral-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  WhatsApp do Lead
                </Label>
                <span className="text-[10px] text-neutral-400 font-normal">
                  (Opcional - caso já tenha o contato)
                </span>
              </div>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: 11999998888 (opcional)"
                className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-500"
              />
              <p className="text-[11px] text-neutral-400 leading-tight">
                💡 Caso ainda não tenha o telefone, deixe em branco para salvar como alvo de visita
                ou prospecção no campo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Roteiro & Pitch Sugerido de Abordagem
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold shadow-lg shadow-amber-500/20"
              >
                {loading ? "Criando Oportunidade..." : "Salvar no Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
