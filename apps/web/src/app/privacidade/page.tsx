import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, FileText, CheckCircle2 } from "lucide-react";
import { LandingSubpageHeader } from "@/components/landing/landing-subpage-header";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados | EnergivIA",
  description:
    "Política de Privacidade e Conformidade com a LGPD (Lei nº 13.709/2018) da EnergivIA.",
};

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <div
      className="landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white antialiased font-plus-jakarta selection:bg-[#10b981]/30 selection:text-white"
      style={{ colorScheme: "dark" }}
    >
      {/* Ambient background lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[200px] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute top-[800px] -right-[150px] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.08),transparent_70%)] blur-3xl" />
      </div>

      <LandingSubpageHeader />

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-[32px] glass-panel p-7 sm:p-10 border-white/10 shadow-2xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Em conformidade com a LGPD (Lei nº 13.709/2018)
            </span>
            <span className="text-xs text-slate-400">
              Última atualização: 03 de Setembro de 2026
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Política de Privacidade e Tratamento de Dados
          </h1>
          <p className="mt-4 text-base text-slate-300 font-light leading-relaxed">
            A <strong className="text-white font-medium">EnergivIA Tecnologia Ltda.</strong> tem o
            compromisso de resguardar a privacidade e a segurança das informações trafegadas e
            armazenadas em sua plataforma, operando em estrita observância à Lei Geral de Proteção
            de Dados (LGPD).
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-300 font-light">
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Lock className="h-5 w-5 text-emerald-400" />
                1. Papéis e Responsabilidades (Controlador x Operador)
              </h2>
              <p>
                1.1.{" "}
                <strong className="text-white font-medium">Dados Cadastrais do Integrador:</strong>{" "}
                A EnergivIA atua como <em className="text-emerald-300">Controladora</em> no que
                tange aos dados de cadastro da empresa integradora (CNPJ, nome, e-mail, telefone,
                faturamento e dados de cobrança), tratando-os para execução do contrato de prestação
                de serviços.
              </p>
              <p>
                1.2.{" "}
                <strong className="text-white font-medium">
                  Dados de Clientes Finais (Faturas e Propostas):
                </strong>{" "}
                O <em className="text-emerald-300">Integrador atua como Controlador</em> e a{" "}
                <em className="text-emerald-300">EnergivIA atua como Operadora</em>. O Integrador
                garante que possui base legal legítima para coletar faturas e documentos de
                terceiros antes de inseri-los no sistema para geração de propostas.
              </p>
            </section>

            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <FileText className="h-5 w-5 text-emerald-400" />
                2. Coleta e Finalidade dos Dados
              </h2>
              <p>Os dados coletados são utilizados estritamente para:</p>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-slate-300">
                <li>Processar o OCR e leitura automática de faturas de energia;</li>
                <li>
                  Calcular médias de consumo e dimensionar propostas comerciais solares
                  personalizadas;
                </li>
                <li>
                  Permitir o envio de propostas via WhatsApp e e-mail por solicitação do Integrador;
                </li>
                <li>Garantir a segurança, auditoria e prevenção a fraudes no acesso ao sistema.</li>
              </ul>
            </section>

            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                3. Segurança da Informação
              </h2>
              <p>
                Adotamos criptografia em trânsito (HTTPS / TLS 1.3), criptografia de dados sensíveis
                em repouso e isolamento de banco de dados (multi-tenancy) para garantir que nenhuma
                empresa parceira tenha acesso aos dados ou clientes de outro integrador.
              </p>
            </section>

            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                4. Contato do Encarregado de Dados (DPO)
              </h2>
              <p>
                Para dúvidas, solicitações de exclusão de dados ou esclarecimentos sobre o
                tratamento de suas informações, entre em contato pelo e-mail:{" "}
                <strong className="text-white font-medium">contato@energivia.com.br</strong> ou pelo
                suporte no WhatsApp.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Documento revisado e atualizado conforme normativas da ANPD.
            </span>
            <Link
              href="/termos-de-uso"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ver Termos de Uso e Isenção Técnica &rarr;
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
