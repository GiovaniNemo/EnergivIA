"use client";

import { useState } from "react";
import { Copy, Check, Share2, Sparkles, MessageSquare, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SalesRepLinkCardProps {
  referralCode?: string;
  referralLink?: string;
}

export function SalesRepLinkCard({
  referralCode,
  referralLink,
}: SalesRepLinkCardProps): JSX.Element {
  const [copiedType, setCopiedType] = useState<"bot" | "web" | null>(null);

  const rawLink = referralLink || "https://www.energivia.com.br/cadastro";
  const webLink = rawLink.replace("app.energivia.com.br", "www.energivia.com.br");

  // Link do Bot no WhatsApp (com redirecionamento inteligente /w/:code)
  const baseUrl = webLink.split("/cadastro")[0] || "https://www.energivia.com.br";
  const botLink = referralCode ? `${baseUrl}/w/${referralCode}` : `${baseUrl}/w`;

  const handleCopy = async (text: string, type: "bot" | "web") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareBotWhatsApp = () => {
    const text = encodeURIComponent(
      `Pessoal, testem esse assistente de IA da EnergivIA para dimensionamento e orçamentos solares em 30 segundos no WhatsApp: ${botLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900/40 p-6 backdrop-blur-xl shadow-xs dark:shadow-xl">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Links Exclusivos de Indicação
              {referralCode && (
                <span className="font-mono text-emerald-800 dark:text-emerald-300">
                  ({referralCode})
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Atribuição Automática de Integradores
            </h3>
            <p className="text-sm text-zinc-600 dark:text-slate-400 max-w-2xl">
              Divulgue a EnergivIA nos seus canais. O sistema identifica e vincula o cliente à sua
              carteira mesmo se ele testar primeiro pelo WhatsApp e criar a conta dias depois.
            </p>
          </div>
        </div>

        {/* Grade com os 2 Links de Divulgação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {/* CARD 1: Bot no WhatsApp (Ideal para Grupos) */}
          <div className="rounded-xl border border-emerald-500/40 bg-white/90 dark:bg-slate-900/80 p-4 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                  <span>Link do Bot no WhatsApp</span>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                  Recomendado para Grupos
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-slate-400">
                Grava cookie de 30 dias no celular e abre o WhatsApp com o bot de dimensionamento
                com IA já associado a você.
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={botLink}
                  className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(botLink, "bot")}
                  className="flex-1 h-9 border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 text-zinc-700 dark:text-white text-xs gap-1.5"
                >
                  {copiedType === "bot" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-300" />
                      <span>Copiar link</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareBotWhatsApp}
                  className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5 shadow-sm"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Divulgar no WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>

          {/* CARD 2: Cadastro Direto no Site */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-4 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <Globe className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
                  <span>Link de Cadastro Web</span>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-slate-400">
                  Plataforma
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-slate-400">
                Leva o integrador direto para a página de criação de conta no site da EnergivIA.
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={webLink}
                  className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(webLink, "web")}
                  className="w-full h-9 border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 text-zinc-700 dark:text-white text-xs gap-1.5"
                >
                  {copiedType === "web" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-slate-300" />
                      <span>Copiar link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
