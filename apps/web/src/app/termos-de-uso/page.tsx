import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  Scale,
  Cpu,
  AlertTriangle,
  Building2,
  Layers,
  Zap,
} from "lucide-react";
import { LandingSubpageHeader } from "@/components/landing/landing-subpage-header";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Termos e Condições de Uso e Responsabilidade Técnica | EnergivIA",
  description:
    "Termos e Condições Gerais de Uso, Isenção de Responsabilidade Técnica, Limitações de IA e Diretrizes da Plataforma EnergivIA.",
};

export default function TermsOfUsePage(): JSX.Element {
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
          {/* Document Header Badge */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Scale className="h-3.5 w-3.5 text-emerald-400" />
              Documento Jurídico Oficial
            </span>
            <span className="text-xs text-slate-400">Última atualização: Setembro de 2026</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Termos e Condições Gerais de Uso e Responsabilidade Técnica
          </h1>

          <div className="mt-5 rounded-2xl glass-card p-5 text-sm leading-relaxed text-slate-300 border-white/10 font-light">
            <p className="font-semibold text-white">Bem-vindo(a) à ENERGIVIA LTDA.</p>
            <p className="mt-2">
              Ao se cadastrar e utilizar os nossos serviços, o usuário (doravante
              &quot;Integrador&quot;) concorda expressamente com as regras abaixo, que delimitam a
              responsabilidade técnica, civil e comercial da plataforma.
            </p>
          </div>

          {/* Destaque de Isenção Técnica / IA */}
          <div className="my-8 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-amber-200">
                  Aviso Importante: Inteligência Artificial e Isenção de Responsabilidade de
                  Engenharia (Cláusula Crítica)
                </h2>
                <p className="text-sm leading-relaxed text-amber-200/90 font-light">
                  As simulações, dimensionamentos de kits e orçamentos gerados pela{" "}
                  <strong className="text-white font-medium">ENERGIVIA LTDA</strong> são
                  exclusivamente estimativas computacionais preliminares com finalidade de apoio
                  comercial.
                </p>
                <p className="text-sm font-medium leading-relaxed text-amber-100">
                  Esta plataforma não substitui a vistoria técnica presencial, a análise estrutural
                  do telhado, o projeto elétrico detalhado e, sob nenhuma hipótese, supre a
                  necessidade de emissão de Anotação de Responsabilidade Técnica (ART) ou Termo de
                  Responsabilidade Técnica (TRT) por um engenheiro ou técnico legalmente habilitado
                  junto ao CREA/CFT e à concessionária local.
                </p>
              </div>
            </div>
          </div>

          {/* Cláusulas detalhadas */}
          <div className="space-y-8 text-sm leading-relaxed text-slate-300 font-light">
            {/* Seção 1 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Building2 className="h-5 w-5 text-emerald-400" />
                1. Qualificação e Natureza do Serviço
              </h2>
              <p>
                A <strong className="text-white font-medium">ENERGIVIA LTDA</strong>, pessoa
                jurídica de direito privado inscrita no CNPJ/MF sob o nº{" "}
                <strong className="text-white font-medium">66.304.358/0001-16</strong>, com sede em
                Maringá-PR, fornece um ecossistema de inteligência comercial e dimensionamento
                fotovoltaico, acessível nativamente via WhatsApp e pela plataforma web{" "}
                <Link
                  href="/"
                  className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  www.energivia.com.br
                </Link>
                . O sistema atua exclusivamente como um software como serviço (SaaS) facilitador
                comercial.
              </p>
            </section>

            {/* Seção 2 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Cpu className="h-5 w-5 text-emerald-400" />
                2. Limitações da Inteligência Artificial e Isenção de Erros
              </h2>
              <p>
                Nossos serviços utilizam modelos de Inteligência Artificial (IA) e Visão
                Computacional para automação de atendimento, leitura de faturas (OCR) e cálculos de
                dimensionamento.
              </p>
              <div className="space-y-2 pl-4 border-l-2 border-emerald-500/30">
                <p>
                  <strong className="text-white font-medium">
                    2.1. Margem de Erro da Tecnologia:
                  </strong>{" "}
                  O Integrador declara estar ciente de que softwares baseados em inteligência
                  artificial são experimentais e estão sujeitos a falhas de leitura, alucinações de
                  dados e imprecisões sistêmicas.
                </p>
                <p>
                  <strong className="text-white font-medium">
                    2.2. Ausência de Garantia de Exatidão:
                  </strong>{" "}
                  A plataforma não garante a exatidão milimétrica e incondicional das informações
                  extraídas ou dos cálculos gerados, cabendo ao Integrador a conferência absoluta de
                  cada variável.
                </p>
              </div>
            </section>

            {/* Seção 3 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                3. Isenção de Responsabilidade de Engenharia (Cláusula Crítica)
              </h2>
              <p>
                As simulações, dimensionamentos de kits e orçamentos gerados pela{" "}
                <strong className="text-white font-medium">ENERGIVIA LTDA</strong> são
                exclusivamente estimativas computacionais preliminares.
              </p>
              <div className="space-y-2 pl-4 border-l-2 border-amber-500/30">
                <p>
                  <strong className="text-white font-medium">
                    3.1. Não Substituição Profissional:
                  </strong>{" "}
                  Esta plataforma não substitui a vistoria técnica presencial, a análise estrutural
                  do telhado, o projeto elétrico detalhado e, sob nenhuma hipótese, supre a
                  necessidade de emissão de Anotação de Responsabilidade Técnica (ART) ou Termo de
                  Responsabilidade Técnica (TRT) por um engenheiro ou técnico legalmente habilitado.
                </p>
              </div>
            </section>

            {/* Seção 4 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Zap className="h-5 w-5 text-emerald-400" />
                4. Dever de Validação Exclusivo do Integrador
              </h2>
              <p>
                É de responsabilidade integral e inalienável do Integrador revisar e validar todos
                os dados gerados pela inteligência artificial antes de qualquer formalização de
                venda junto ao cliente final ou submissão à concessionária, incluindo
                obrigatoriamente:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-xl glass-card p-4 border-white/10">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Histórico de Consumo e Conexão
                  </p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed font-light">
                    A exatidão da leitura do histórico de consumo e do tipo de conexão da rede
                    elétrica (monofásico, bifásico ou trifásico).
                  </p>
                </div>

                <div className="rounded-xl glass-card p-4 border-white/10">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Limites Térmicos e Elétricos
                  </p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed font-light">
                    Respeitar rigorosamente o limite de sobrecarga (Overload), a tensão máxima da
                    string (Voc) corrigida pela temperatura local, e a corrente de curto-circuito
                    (Isc) e operacional (Imp) suportada pelas entradas MPPT dos inversores.
                  </p>
                </div>
              </div>
            </section>

            {/* Seção 5 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                5. Limitação de Responsabilidade e Indenizações
              </h2>
              <p>
                A <strong className="text-white font-medium">ENERGIVIA LTDA</strong> está isenta de
                qualquer responsabilidade civil, técnica, material ou moral decorrente de
                subdimensionamento ou sobredimensionamento de usinas fotovoltaicas.
              </p>
              <p>
                Não nos responsabilizamos por perdas financeiras, queima de equipamentos, perda de
                garantias de fabricantes, lucros cessantes (&quot;vendas perdidas&quot;), recusa de
                homologação em concessionárias ou não atingimento da geração de energia prometida ao
                cliente final, decorrentes de projetos executados com ou sem a conferência técnica
                por parte do Integrador.
              </p>
            </section>

            {/* Seção 6 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Layers className="h-5 w-5 text-emerald-400" />
                6. Cadeia de Fornecimento e Dados Pessoais (CDC e LGPD)
              </h2>
              <div className="space-y-3 pl-4 border-l-2 border-emerald-500/30">
                <p>
                  <strong className="text-white font-medium">6.1. Sem Vínculo Mercantil:</strong> A
                  ENERGIVIA LTDA não vende equipamentos, não mantém estoque e não realiza logística,
                  sendo isenta de solidariedade por vícios, garantias físicas ou atrasos de entrega
                  de fornecedores e fabricantes terceiros (Art. 18, CDC).
                </p>
                <p>
                  <strong className="text-white font-medium">
                    6.2. LGPD (Lei nº 13.709/2018):
                  </strong>{" "}
                  O Integrador atua como Controlador dos dados do cliente final inseridos no sistema
                  (faturas, contatos), garantindo que possui o devido consentimento para tráfego
                  dessas informações via WhatsApp e na plataforma web. A EnergivIA atua como
                  Operadora técnica, aplicando diretrizes de segurança e isolamento dos dados.
                </p>
              </div>
            </section>

            {/* Seção 7 */}
            <section className="rounded-2xl glass-card p-6 border-white/10 space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-white">
                <Scale className="h-5 w-5 text-emerald-400" />
                7. Foro e Aceite
              </h2>
              <p>
                Ao concluir o cadastro pelo site ou iniciar o uso do ecossistema via WhatsApp, o
                Integrador firma eletronicamente sua concordância integral com estes termos. Fica
                eleito o foro da Comarca de Maringá, Estado do Paraná, para dirimir quaisquer
                controvérsias.
              </p>
            </section>
          </div>

          {/* Rodapé interno / Navegação para Privacidade */}
          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()} ENERGIVIA LTDA. CNPJ: 66.304.358/0001-16.
            </span>
            <Link
              href="/privacidade"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ver Política de Privacidade e LGPD &rarr;
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
