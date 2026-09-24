import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Scale,
  Cpu,
  AlertTriangle,
  Building2,
  Layers,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Termos e Condições de Uso e Responsabilidade Técnica | EnergivIA",
  description:
    "Termos e Condições Gerais de Uso, Isenção de Responsabilidade Técnica, Limitações de IA e Diretrizes da Plataforma EnergivIA.",
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
          <span className="text-xs text-slate-500">Última atualização: Setembro de 2026</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Termos e Condições Gerais de Uso e Responsabilidade Técnica
        </h1>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">
            Bem-vindo(a) à ENERGIVIA LTDA.
          </p>
          <p className="mt-2">
            Ao se cadastrar e utilizar os nossos serviços, o usuário (doravante
            &quot;Integrador&quot;) concorda expressamente com as regras abaixo, que delimitam a
            responsabilidade técnica, civil e comercial da plataforma.
          </p>
        </div>

        {/* Destaque de Isenção Técnica / IA */}
        <div className="my-8 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 dark:border-amber-500/40">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200">
                Aviso Importante: Inteligência Artificial e Isenção de Responsabilidade de
                Engenharia (Cláusula Crítica)
              </h2>
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-300">
                As simulações, dimensionamentos de kits e orçamentos gerados pela{" "}
                <strong>ENERGIVIA LTDA</strong> são exclusivamente estimativas computacionais
                preliminares com finalidade de apoio comercial.
              </p>
              <p className="text-sm font-semibold leading-relaxed text-amber-950 dark:text-amber-100">
                Esta plataforma não substitui a vistoria técnica presencial, a análise estrutural do
                telhado, o projeto elétrico detalhado e, sob nenhuma hipótese, supre a necessidade
                de emissão de Anotação de Responsabilidade Técnica (ART) ou Termo de
                Responsabilidade Técnica (TRT) por um engenheiro ou técnico legalmente habilitado
                junto ao CREA/CFT e à concessionária local.
              </p>
            </div>
          </div>
        </div>

        {/* Cláusulas detalhadas */}
        <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Seção 1 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Building2 className="h-5 w-5 text-[#1f7f9b]" />
              1. Qualificação e Natureza do Serviço
            </h2>
            <p>
              A <strong>ENERGIVIA LTDA</strong>, pessoa jurídica de direito privado inscrita no
              CNPJ/MF sob o nº <strong>66.304.358/0001-16</strong>, com sede em Maringá-PR, fornece
              um ecossistema de inteligência comercial e dimensionamento fotovoltaico, acessível
              nativamente via WhatsApp e pela plataforma web{" "}
              <a
                href="https://www.energivia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#1f7f9b] hover:underline"
              >
                www.energivia.com.br
              </a>
              . O sistema atua exclusivamente como um software como serviço (SaaS) facilitador
              comercial.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Cpu className="h-5 w-5 text-[#1f7f9b]" />
              2. Limitações da Inteligência Artificial e Isenção de Erros
            </h2>
            <p>
              Nossos serviços utilizam modelos de Inteligência Artificial (IA) e Visão Computacional
              para automação de atendimento, leitura de faturas (OCR) e cálculos de dimensionamento.
            </p>
            <div className="space-y-2 pl-4 border-l-2 border-[#1f7f9b]/30">
              <p>
                <strong>2.1. Margem de Erro da Tecnologia:</strong> O Integrador declara estar
                ciente de que softwares baseados em inteligência artificial são experimentais e
                estão sujeitos a falhas de leitura, alucinações de dados e imprecisões sistêmicas.
              </p>
              <p>
                <strong>2.2. Ausência de Garantia de Exatidão:</strong> A plataforma não garante a
                exatidão milimétrica e incondicional das informações extraídas ou dos cálculos
                gerados, cabendo ao Integrador a conferência absoluta de cada variável.
              </p>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              3. Isenção de Responsabilidade de Engenharia (Cláusula Crítica)
            </h2>
            <p>
              As simulações, dimensionamentos de kits e orçamentos gerados pela{" "}
              <strong>ENERGIVIA LTDA</strong> são exclusivamente estimativas computacionais
              preliminares.
            </p>
            <div className="space-y-2 pl-4 border-l-2 border-amber-500/30">
              <p>
                <strong>3.1. Não Substituição Profissional:</strong> Esta plataforma não substitui a
                vistoria técnica presencial, a análise estrutural do telhado, o projeto elétrico
                detalhado e, sob nenhuma hipótese, supre a necessidade de emissão de Anotação de
                Responsabilidade Técnica (ART) ou Termo de Responsabilidade Técnica (TRT) por um
                engenheiro ou técnico legalmente habilitado.
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Zap className="h-5 w-5 text-[#1f7f9b]" />
              4. Dever de Validação Exclusivo do Integrador
            </h2>
            <p>
              É de responsabilidade integral e inalienável do Integrador revisar e validar todos os
              dados gerados pela inteligência artificial antes de qualquer formalização de venda
              junto ao cliente final ou submissão à concessionária, incluindo obrigatoriamente:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Histórico de Consumo e Conexão
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  A exatidão da leitura do histórico de consumo e do tipo de conexão da rede
                  elétrica (monofásico, bifásico ou trifásico).
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Limites Térmicos e Elétricos
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Respeitar rigorosamente o limite de sobrecarga (Overload), a tensão máxima da
                  string (Voc) corrigida pela temperatura local, e a corrente de curto-circuito
                  (Isc) e operacional (Imp) suportada pelas entradas MPPT dos inversores.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              5. Limitação de Responsabilidade e Indenizações
            </h2>
            <p>
              A <strong>ENERGIVIA LTDA</strong> está isenta de qualquer responsabilidade civil,
              técnica, material ou moral decorrente de subdimensionamento ou sobredimensionamento de
              usinas fotovoltaicas.
            </p>
            <p>
              Não nos responsabilizamos por perdas financeiras, queima de equipamentos, perda de
              garantias de fabricantes, lucros cessantes (&quot;vendas perdidas&quot;), recusa de
              homologação em concessionárias ou não atingimento da geração de energia prometida ao
              cliente final, decorrentes de projetos executados com ou sem a conferência técnica por
              parte do Integrador.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Layers className="h-5 w-5 text-[#1f7f9b]" />
              6. Cadeia de Fornecimento e Dados Pessoais (CDC e LGPD)
            </h2>
            <div className="space-y-3 pl-4 border-l-2 border-[#1f7f9b]/30">
              <p>
                <strong>6.1. Sem Vínculo Mercantil:</strong> A ENERGIVIA LTDA não vende
                equipamentos, não mantém estoque e não realiza logística, sendo isenta de
                solidariedade por vícios, garantias físicas ou atrasos de entrega de fornecedores e
                fabricantes terceiros (Art. 18, CDC).
              </p>
              <p>
                <strong>6.2. LGPD (Lei nº 13.709/2018):</strong> O Integrador atua como Controlador
                dos dados do cliente final inseridos no sistema (faturas, contatos), garantindo que
                possui o devido consentimento para tráfego dessas informações via WhatsApp e na
                plataforma web. A EnergivIA atua como Operadora técnica, aplicando diretrizes de
                segurança e isolamento dos dados.
              </p>
            </div>
          </section>

          {/* Seção 7 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Scale className="h-5 w-5 text-[#1f7f9b]" />
              7. Foro e Aceite
            </h2>
            <p>
              Ao concluir o cadastro pelo site{" "}
              <a
                href="https://www.energivia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#1f7f9b] hover:underline"
              >
                www.energivia.com.br
              </a>{" "}
              ou iniciar o uso do ecossistema via WhatsApp, o Integrador firma eletronicamente sua
              concordância integral com estes termos. Fica eleito o foro da Comarca de Maringá,
              Estado do Paraná, para dirimir quaisquer controvérsias.
            </p>
          </section>
        </div>

        {/* Rodapé interno */}
        <div className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} ENERGIVIA LTDA. CNPJ: 66.304.358/0001-16. Sede em
              Maringá-PR. Todos os direitos reservados.
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
