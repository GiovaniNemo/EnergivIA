import React from "react";
import { Img, staticFile } from "remotion";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Layers,
  SunMedium,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronDown,
  Upload,
} from "lucide-react";

interface RealPlatformShellProps {
  activeNav: "dashboard" | "pipeline" | "propostas" | "templates" | "solar";
  children: React.ReactNode;
  headerTitle?: string;
  headerBadge?: string;
}

export const RealPlatformShell: React.FC<RealPlatformShellProps> = ({
  activeNav,
  children,
  headerTitle = "Painel",
  headerBadge = "Visão da Empresa",
}) => {
  return (
    <div className="flex h-full w-full flex-col bg-[#080C14] text-slate-100 font-sans select-none overflow-hidden">
      {/* Topbar Oficial Real da EnergivIA */}
      <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#0B0F19] px-6 z-30">
        {/* Lado Esquerdo: Logo Oficial da EnergivIA e Seletor de Organização */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <Img
              src={staticFile("logo-dark.png")}
              style={{ height: 38, width: "auto", objectFit: "contain" }}
            />
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Organization Switcher Real */}
          <div className="flex items-center space-x-2.5 rounded-xl border border-slate-800 bg-[#0F1626] px-3 py-1.5 text-xs">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">
              Solar Prime Engenharia
            </span>
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/50">
              PRO
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Centro: Barra de Busca Global Real */}
        <div className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-[#0D1322] px-3.5 py-1.5 text-xs text-slate-400 w-96">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="flex-1 text-slate-400">
            Buscar clientes, propostas ou faturas...
          </span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
            Ctrl+K
          </span>
        </div>

        {/* Lado Direito: Ações e Perfil do Usuário */}
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800">
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            <span>Carregar Conta</span>
          </button>

          <button className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20">
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Proposta</span>
          </button>

          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0F1626] text-slate-300">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
              3
            </span>
          </div>

          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              SP
            </div>
            <div className="text-left leading-tight hidden lg:block">
              <span className="text-xs font-semibold text-slate-200 block">
                Carlos Silva
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Integrador Solar
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Corpo com Sidebar Real e Área Principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Oficial da Plataforma EnergivIA */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#0A0E17] p-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-300">
              Menu Principal
            </div>

            <div
              className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                activeNav === "dashboard"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Painel</span>
            </div>

            <div
              className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                activeNav === "pipeline"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span>Pipeline (CRM)</span>
            </div>

            <div
              className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                activeNav === "propostas"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Propostas</span>
            </div>

            <div
              className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                activeNav === "templates"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Modelos de Proposta</span>
            </div>

            <div
              className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                activeNav === "solar"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SunMedium className="h-4 w-4" />
              <span>Estudo Solar</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
            <div className="flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-400">
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </div>
          </div>
        </aside>

        {/* Área de Conteúdo Central */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070A12] p-8">
          {/* Header Interno da Página */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {headerTitle}
              </h1>
              {headerBadge && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
                  {headerBadge}
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-slate-300">
              Resumo Comercial em Tempo Real
            </span>
          </div>

          <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
};
