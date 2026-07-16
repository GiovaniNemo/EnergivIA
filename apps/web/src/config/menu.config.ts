"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  Truck,
  Users,
  UserPlus,
  Package,
  Shield,
  Handshake,
  Palette,
  ChartColumn,
  LayoutTemplate,
  Wallet,
  Boxes,
  HandCoins,
  Banknote,
  Building2 as BuildingIcon,
  ListChecks,
} from "lucide-react";

export type SidebarSectionKey = "operation" | "management" | "admin" | "platform";
export type SidebarRole = "admin" | "owner" | "platform";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  section: SidebarSectionKey;
  tooltip?: string;
  requiresRole?: SidebarRole;
  highlight?: boolean;
};

export const SECTION_LABELS: Record<SidebarSectionKey, string> = {
  operation: "OPERAÇÃO",
  management: "GESTÃO",
  admin: "ADMIN",
  platform: "PLATAFORMA",
};

export const MENU_ITEMS: MenuItem[] = [
  {
    label: "Painel",
    icon: LayoutDashboard,
    path: "/painel",
    section: "operation",
    tooltip: "Painel: visão geral de leads, propostas e funil",
    highlight: true,
  },
  {
    label: "Clientes",
    icon: Users,
    path: "/clientes",
    section: "operation",
    tooltip: "Clientes: onde você gerencia seus contatos",
    highlight: true,
  },
  {
    label: "Negociações",
    icon: Handshake,
    path: "/pipeline",
    section: "operation",
    tooltip: "Negociações: onde você acompanha suas negociações",
    highlight: true,
  },
  { label: "Propostas", icon: FileText, path: "/propostas", section: "operation", highlight: true },
  {
    label: "Financiamentos",
    icon: HandCoins,
    path: "/financiamento",
    section: "operation",
    tooltip: "Dashboard, Kanban e simulações de financiamento",
    highlight: true,
  },

  {
    label: "Organização",
    icon: Building2,
    path: "/configuracoes/organizacao",
    section: "management",
  },
  {
    label: "Custos do projeto",
    icon: Wallet,
    path: "/configuracoes/custos-projeto",
    section: "management",
    tooltip: "Regras de custo (fixo, % ou por kWp) e faixas de potência",
  },
  {
    label: "Estoque",
    icon: Boxes,
    path: "/configuracoes/estoque",
    section: "management",
    tooltip: "Seu estoque próprio: produtos, quantidade e custo para montar propostas",
  },
  { label: "Equipe", icon: UserPlus, path: "/configuracoes/equipe", section: "management" },
  {
    label: "Templates de Proposta",
    icon: Palette,
    path: "/propostas/templates",
    section: "management",
  },
  { label: "Configurações", icon: Settings, path: "/configuracoes", section: "management" },

  {
    label: "Distribuidores",
    icon: Truck,
    path: "/admin/distribuidores",
    section: "admin",
    requiresRole: "admin",
  },
  {
    label: "Produtos Globais",
    icon: Package,
    path: "/admin/produtos",
    section: "admin",
    requiresRole: "admin",
  },
  {
    label: "Marcas",
    icon: Palette,
    path: "/admin/marcas",
    section: "admin",
    requiresRole: "admin",
  },
  {
    label: "Modelos de template",
    icon: LayoutTemplate,
    path: "/admin/modelos-template",
    section: "admin",
    requiresRole: "admin",
  },
  {
    label: "Métricas",
    icon: ChartColumn,
    path: "/admin/metricas",
    section: "admin",
    requiresRole: "admin",
  },
  {
    label: "Sistema",
    icon: Shield,
    path: "/admin/sistema",
    section: "admin",
    requiresRole: "admin",
  },

  {
    label: "Fila de Financiamentos",
    icon: ListChecks,
    path: "/plataforma/financiamentos",
    section: "platform",
    requiresRole: "platform",
    tooltip: "Kanban cross-tenant de todas as solicitações de financiamento",
  },
  {
    label: "Comissões",
    icon: Banknote,
    path: "/plataforma/comissoes",
    section: "platform",
    requiresRole: "platform",
    tooltip: "Receita Energivia: comissões pagas pelos bancos",
  },
  {
    label: "Financiadores",
    icon: BuildingIcon,
    path: "/plataforma/financiadores",
    section: "platform",
    requiresRole: "platform",
    tooltip: "Cadastro de providers, tabelas de taxa e regras de comissão",
  },
];
