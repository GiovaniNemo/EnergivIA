"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquare, ArrowRight, Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { storeReferralCodeExplicit } from "@/lib/referral-tracker";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";

const DEFAULT_BOT_NUMBER = "554491585309";

export default function PartnerWhatsappRedirectPage(): JSX.Element {
  const params = useParams();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const referralCode = rawCode ? decodeURIComponent(rawCode).trim().toLowerCase() : "";

  const whatsappUrl = useMemo(() => {
    const botNumber =
      process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, "") || DEFAULT_BOT_NUMBER;
    const msg = referralCode
      ? `Olá! Quero testar o assistente de IA da EnergivIA (ref: ${referralCode})`
      : "Olá! Quero testar o assistente de IA da EnergivIA";
    return `https://wa.me/${botNumber}?text=${encodeURIComponent(msg)}`;
  }, [referralCode]);

  useEffect(() => {
    if (!referralCode) return;

    // 1. Grava o cookie de 30 dias e localStorage no navegador do dispositivo
    storeReferralCodeExplicit(referralCode);

    // 2. Dispara redirecionamento automático para o WhatsApp
    const timer = setTimeout(() => {
      try {
        window.location.replace(whatsappUrl);
      } catch {
        // Fallback para clique manual se o navegador restringir replace
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [referralCode, whatsappUrl]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Luz ambiente sutil de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl text-center space-y-6">
          {/* Logo EnergivIA */}
          <div className="flex justify-center items-center">
            <BrandLogo />
          </div>

          {/* Badge de indicação do parceiro */}
          {referralCode && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Indicação de parceiro:</span>
              <span className="font-mono font-semibold text-emerald-300">{referralCode}</span>
            </div>
          )}

          {/* Status de Redirecionamento */}
          <div className="space-y-2 pt-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Abrindo assistente no WhatsApp...
            </h1>
            <p className="text-sm text-slate-400">
              Você será redirecionado para testar nosso robô com inteligência artificial para
              dimensionamento e orçamentos solares.
            </p>
          </div>

          {/* Spinner animado */}
          <div className="flex justify-center items-center py-2">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>

          {/* Botão de Contingência (caso o app não abra sozinho) */}
          <div className="space-y-3 pt-2">
            <Button
              asChild
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl gap-2 shadow-lg shadow-emerald-900/30 transition-all text-sm"
            >
              <a href={whatsappUrl} rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4" />
                <span>Abrir conversa no WhatsApp</span>
              </a>
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
              <span>Vínculo de atendimento seguro EnergivIA</span>
            </div>
          </div>

          {/* Link para quem quiser acessar a web diretamente */}
          <div className="border-t border-white/10 pt-5">
            <Link
              href={
                referralCode ? `/cadastro?ref=${encodeURIComponent(referralCode)}` : "/cadastro"
              }
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span>Prefere se cadastrar pelo computador?</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
