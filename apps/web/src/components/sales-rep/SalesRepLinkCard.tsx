"use client";

import { useState } from "react";
import { Copy, Check, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SalesRepLinkCardProps {
  referralCode?: string;
  referralLink?: string;
}

export function SalesRepLinkCard({
  referralCode,
  referralLink,
}: SalesRepLinkCardProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const rawLink = referralLink || "https://www.energivia.com.br/cadastro";
  const finalLink = rawLink.replace("app.energivia.com.br", "www.energivia.com.br");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Estou liberando seu acesso exclusivo para testar a EnergivIA, plataforma de inteligência artificial para integradores de energia solar. Crie sua conta por aqui: ${finalLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900/40 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Link Exclusivo de Indicação
            {referralCode && <span className="font-mono text-emerald-300">({referralCode})</span>}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Atribuição Automática de Integradores
          </h3>
          <p className="text-sm text-slate-400 max-w-xl">
            Envie este link para empresas solares. Qualquer integrador que iniciar o cadastro por
            ele será vinculado automaticamente à sua carteira de vendas e comissão.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={finalLink}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-slate-300 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 px-3.5 border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-300" />
                  <span>Copiar</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleShareWhatsApp}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
