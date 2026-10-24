"use client";

import { useEffect, useState } from "react";
import { X, Send, Clock, User, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type SalesRepTenant,
  type SalesActivityNote,
  listSalesRepNotes,
  createSalesRepNote,
} from "@/lib/sales-rep-api";

interface SalesRepTenantDrawerProps {
  tenant: SalesRepTenant | null;
  isOpen: boolean;
  onClose: () => void;
  onNoteAdded: () => void;
}

const STAGES = [
  { id: "TRIAL_ONBOARDING", label: "Onboarding Trial" },
  { id: "DEMO", label: "Demo Realizada" },
  { id: "NEGOTIATING", label: "Negociando Plano" },
  { id: "WON", label: "Cliente Ativado" },
  { id: "CHURN_RISK", label: "Risco de Churn" },
];

export function SalesRepTenantDrawer({
  tenant,
  isOpen,
  onClose,
  onNoteAdded,
}: SalesRepTenantDrawerProps): JSX.Element | null {
  const [notes, setNotes] = useState<SalesActivityNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [stage, setStage] = useState("TRIAL_ONBOARDING");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenant) {
      loadNotes(tenant.id);
      setStage(tenant.lastNote?.stage || "TRIAL_ONBOARDING");
    } else {
      setNotes([]);
      setContent("");
      setError(null);
    }
  }, [isOpen, tenant]);

  const loadNotes = async (tenantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSalesRepNotes(tenantId);
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const newNote = await createSalesRepNote(tenant.id, {
        content: content.trim(),
        stage,
      });
      setNotes((prev) => [newNote, ...prev]);
      setContent("");
      onNoteAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar anotação");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-[#050811] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Histórico Comercial
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{tenant.name}</h2>
            <p className="text-xs text-slate-400">
              {tenant.primaryContact?.name} • {tenant.primaryContact?.email || "Sem e-mail"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Formulário de Nova Anotação */}
          <form
            onSubmit={handleAddNote}
            className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/10"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Nova Anotação de Contato</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="text-xs bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-emerald-400 outline-none focus:border-emerald-500"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={3}
              placeholder="Ex: Liguei para o cliente, apresentou objeção de custo mas gostou da geração automática de propostas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs rounded-xl bg-black/40 border border-white/10 p-3 text-white placeholder-slate-400 outline-none focus:border-emerald-500/50 resize-none"
            />

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || !content.trim()}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Salvar Nota</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Timeline de Anotações */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Linha do Tempo
            </h4>

            {loading ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
                <p className="text-xs">Carregando notas...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-white/[0.01] rounded-xl border border-white/5">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-60" />
                <p className="text-xs font-medium text-slate-300">
                  Nenhuma anotação registrada ainda
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione sua primeira impressão da conversa acima.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notes.map((note) => {
                  const stageObj = STAGES.find((s) => s.id === note.stage);
                  const formattedDate = new Date(note.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {stageObj?.label || note.stage}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.content}</p>
                      {note.salesRep?.name && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-white/5">
                          <User className="h-2.5 w-2.5" />
                          <span>Por {note.salesRep.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
