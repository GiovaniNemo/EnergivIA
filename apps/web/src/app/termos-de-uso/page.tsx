import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Scale,
  FileText,
  Cpu,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso e Isenção de Responsabilidade | EnergivIA",
  description:
    "Termos e Condições de Uso, Isenção de Responsabilidade Técnica e Diretrizes da Plataforma EnergivIA.",
};

export default function TermsOfUsePage(): JSX.Element {
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
        {/* Document Header Badge */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1f7f9b]/10 px-3 py-1 text-xs font-semibold text-[#0A4A63] dark:bg-[#1f7f9b]/20 dark:text-cyan-300">
            <Scale className="h-3.5 w-3.5" />
            Documento Jurídico Oficial
          </span>
          <span className="text-xs text-slate-500">Última atualização: 03 de Setembro de 2026</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Termos de Uso e Isenção de Responsabilidade Técnica
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          Por favor, leia atentamente estes Termos e Condições antes de utilizar a plataforma{" "}
          <strong>EnergivIA</strong>. Ao cadastrar-se ou utilizar quaisquer de nossos serviços, você
          declara ciência e concordância irrestrita com todas as cláusulas aqui estipuladas.
        </p>

        {/* Destaque de Isenção Técnica / IA */}
        <div className="my-8 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 dark:border-amber-500/40">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200">
                Aviso Importante: Inteligência Artificial e Responsabilidade Técnica
              </h2>
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-300">
                A EnergivIA é uma ferramenta de apoio comercial e simulação preliminar.{" "}
                <strong>
                  Todos os cálculos de geração, dimensionamento, potência de inversores, quantidade
                  de módulos e retornos financeiros gerados por algoritmos ou inteligência
                  artificial possuem caráter meramente estimativo.
                </strong>
              </p>
              <p className="text-sm font-semibold leading-relaxed text-amber-950 dark:text-amber-100">
                É dever e responsabilidade exclusiva do Integrador/Empresa Contratante realizar a
                vistoria técnica presencial no imóvel, validar a integridade estrutural e elétrica,
                e submeter o projeto à aprovação de engenheiro ou técnico habilitado com respectiva
                ART/TRT perante o CREA/CFT e a Concessionária de Energia local.
              </p>
            </div>
          </div>
        </div>

        {/* Cláusulas detalhadas */}
        <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Seção 1 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-[#1f7f9b]" />
              1. Objeto e Natureza da Plataforma
            </h2>
            <p>
              1.1. A <strong>EnergivIA</strong> é uma plataforma de Software como Serviço (SaaS)
              desenvolvida para auxiliar integradores solares na automação comercial, leitura
              digital de faturas de energia elétrica, elaboração ágil de propostas comerciais e
              gestão de leads.
            </p>
            <p>
              1.2. A EnergivIA <strong>NÃO</strong> presta serviços de engenharia executiva,
              instalação física, consultoria jurídica ou homologação de projetos elétricos perante
              as distribuidoras de energia. A plataforma é estritamente um instrumento tecnológico
              facilitador de vendas.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Cpu className="h-5 w-5 text-[#1f7f9b]" />
              2. Cálculos por Inteligência Artificial e Estimativas
            </h2>
            <p>
              2.1. As propostas geradas utilizam inteligência artificial, índices médios de
              irradiação solar (HSP) e fórmulas matemáticas de engenharia solar simplificadas.
              Fatores externos e imprevisíveis como:
            </p>
            <ul className="list-inside list-disc space-y-1 pl-2 text-slate-600 dark:text-slate-400">
              <li>Sombreamentos pontuais (árvores, prédios vizinhos, relevo local);</li>
              <li>Inclinação e azimute real dos telhados;</li>
              <li>Condições e perdas por cabeamento, temperatura ou sujeira nos módulos;</li>
              <li>Flutuações climáticas sazonais atípicas;</li>
              <li>
                Mudanças tarifárias das distribuidoras ou enquadramentos da Lei 14.300/2022 (Fio B);
              </li>
            </ul>
            <p>
              podem gerar divergências entre a simulação preliminar e a geração solar real do
              sistema após instalado.
            </p>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              3. Responsabilidades Exclusivas do Integrador
            </h2>
            <p>
              3.1. Ao utilizar a EnergivIA, o{" "}
              <strong>
                Integrador assume integral responsabilidade civil, técnica e comercial perante seus
                clientes finais
              </strong>{" "}
              por:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ✓ Vistoria Técnica Obrigatória
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Inspecionar presencialmente o local, estrutura física do telhado/solo e capacidade
                  do padrão de entrada.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ✓ Validação de Equipamentos
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Conferir compatibilidade entre inversores, quantidade de strings, tensão de
                  circuito aberto (Voc) e módulos.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ✓ ART / TRT de Engenharia
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Recolher a devida Anotação ou Termo de Responsabilidade Técnica por profissional
                  habilitado (CREA/CFT).
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ✓ Homologação na Concessionária
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submeter parecer de acesso e cumprir os requisitos normativos da distribuidora de
                  energia.
                </p>
              </div>
            </div>
            <p className="mt-2">
              3.2. A EnergivIA está expressamente isenta de qualquer responsabilidade ou
              solidariedade passiva decorrente de falhas de instalação, erros de dimensionamento não
              revisados pelo integrador, sinistros elétricos, recusa de parecer de acesso ou
              disputas de garantia entre o integrador e o consumidor final.
            </p>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Uso Adequado e Segurança da Informação
            </h2>
            <p>
              4.1. O Integrador compromete-se a utilizar a plataforma estritamente para os fins
              previstos, sendo proibida a inserção de documentos forjados, simulações fraudulentas,
              ataques de força bruta, extração não autorizada de dados (scraping) ou engenharia
              reversa.
            </p>
            <p>
              4.2. Cada conta é de uso exclusivo da empresa contratante e de seus colaboradores
              autorizados, sendo o Integrador responsável pelo sigilo de suas credenciais.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Privacidade e Proteção de Dados (LGPD)
            </h2>
            <p>
              5.1. Em observância à Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018):
            </p>
            <p>
              - O <strong>Integrador atua na qualidade de CONTROLADOR</strong> dos dados pessoais e
              faturas de seus clientes finais inseridas no sistema, declarando possuir consentimento
              ou base legal legítima para o tratamento;
              <br />- A <strong>EnergivIA atua como OPERADORA</strong>, executando o processamento
              computacional seguro com a finalidade exclusiva de prestar as funcionalidades
              contratadas.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Foro de Eleição</h2>
            <p>
              6.1. Fica eleito o Foro da Comarca de Maringá, Estado do Paraná, com exclusão de
              qualquer outro por mais privilegiado que seja, para dirimir eventuais litígios
              oriundos deste instrumento.
            </p>
          </section>
        </div>

        {/* Rodapé interno */}
        <div className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} EnergivIA Tecnologia Ltda. CNPJ: 66.304.358/0001-16.
              Todos os direitos reservados.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f7f9b] hover:underline"
            >
              <CheckCircle2 className="h-4 w-4" />
              Conheça a plataforma completa
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
