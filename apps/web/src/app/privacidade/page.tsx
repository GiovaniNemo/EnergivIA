import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados | EnergivIA",
  description:
    "Política de Privacidade e Conformidade com a LGPD (Lei nº 13.709/2018) da EnergivIA.",
};

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="EnergivIA"
              width={180}
              height={40}
              className="h-9 w-auto object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo-dark.png"
              alt="EnergivIA"
              width={180}
              height={40}
              className="hidden h-9 w-auto object-contain dark:block"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para o início
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Em conformidade com a LGPD (Lei nº 13.709/2018)
          </span>
          <span className="text-xs text-slate-500">Última atualização: 03 de Setembro de 2026</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Política de Privacidade e Tratamento de Dados
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          A <strong>EnergivIA Tecnologia Ltda.</strong> tem o compromisso de resguardar a
          privacidade e a segurança das informações trafegadas e armazenadas em sua plataforma,
          operando em estrita observância à Lei Geral de Proteção de Dados (LGPD).
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Lock className="h-5 w-5 text-emerald-600" />
              1. Papéis e Responsabilidades (Controlador x Operador)
            </h2>
            <p>
              1.1. <strong>Dados Cadastrais do Integrador:</strong> A EnergivIA atua como{" "}
              <em>Controladora</em> no que tange aos dados de cadastro da empresa integradora (CNPJ,
              nome, e-mail, telefone, faturamento e dados de cobrança), tratando-os para execução do
              contrato de prestação de serviços.
            </p>
            <p>
              1.2. <strong>Dados de Clientes Finais (Faturas e Propostas):</strong> O{" "}
              <em>Integrador atua como Controlador</em> e a <em>EnergivIA atua como Operadora</em>.
              O Integrador garante que possui base legal legítima para coletar faturas e documentos
              de terceiros antes de inseri-los no sistema para geração de propostas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-emerald-600" />
              2. Coleta e Finalidade dos Dados
            </h2>
            <p>Os dados coletados são utilizados estritamente para:</p>
            <ul className="list-inside list-disc space-y-1 pl-2 text-slate-600 dark:text-slate-400">
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

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Segurança da Informação
            </h2>
            <p>
              Adotamos criptografia em trânsito (HTTPS / TLS 1.3), criptografia de dados sensíveis
              em repouso e isolamento de banco de dados (multi-tenancy) para garantir que nenhuma
              empresa parceira tenha acesso aos dados ou clientes de outro integrador.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Contato do Encarregado de Dados (DPO)
            </h2>
            <p>
              Para dúvidas, solicitações de exclusão de dados ou esclarecimentos sobre o tratamento
              de suas informações, entre em contato pelo e-mail:{" "}
              <strong>contato@energivia.com.br</strong> ou pelo suporte no WhatsApp.
            </p>
          </section>
        </div>

        <div className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} EnergivIA Tecnologia Ltda. CNPJ: 66.304.358/0001-16.
            </p>
            <Link
              href="/termos-de-uso"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f7f9b] hover:underline"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ver Termos de Uso e Isenção Técnica
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
