"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Building2,
  Compass,
  Crown,
  FilePlus,
  FileText,
  Handshake,
  Loader2,
  Package,
  Palette,
  Receipt,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Truck,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/components/providers/organization-provider";
import { useShortcutMod } from "@/hooks/use-media-query";
import {
  fetchGlobalSearch,
  type GlobalSearchDealItem,
  type GlobalSearchLeadItem,
  type GlobalSearchProposalItem,
} from "@/lib/search-api";

const STAGE_LABEL: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contato",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
};

const STAGE_PILL_CLASS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  CONTACTED:
    "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  PROPOSAL:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  NEGOTIATION:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  WON: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  LOST: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  VIEWED: "Visualizada",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
};

const PROPOSAL_STATUS_CLASS: Record<string, string> = {
  DRAFT:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  SENT: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  VIEWED:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  ACCEPTED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  REJECTED:
    "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

function formatWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12) return `+${d}`;
  const ddi = d.slice(0, d.length - 11);
  const ddd = d.slice(-11, -9);
  const rest = d.slice(-9);
  const body = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : rest;
  return `+${ddi} (${ddd}) ${body}`;
}

function formatBrl(val: number | string | null | undefined): string | null {
  if (val == null) return null;
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return null;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  keywords: string[];
  icon: typeof Search;
  badge?: string;
}

const STATIC_NAV_ITEMS: NavItem[] = [
  {
    id: "nav-pipeline",
    title: "Negociações (Funil de Vendas)",
    subtitle: "Acompanhe e mova oportunidades pelo Kanban comercial",
    path: "/pipeline",
    keywords: [
      "pipeline",
      "funil",
      "negociacao",
      "negociação",
      "kanban",
      "vendas",
      "etapas",
      "oportunidades",
    ],
    icon: Handshake,
  },
  {
    id: "nav-propostas",
    title: "Propostas Comerciais",
    subtitle: "Listagem, status de visualização e geração de estudos",
    path: "/propostas",
    keywords: ["propostas", "proposta", "comercial", "orçamento", "estudos", "pdf", "valores"],
    icon: FileText,
  },
  {
    id: "nav-clientes",
    title: "Clientes & Contatos",
    subtitle: "Gerencie a base de clientes, WhatsApp e histórico",
    path: "/clientes",
    keywords: ["clientes", "cliente", "leads", "lead", "contatos", "whatsapp", "cadastro"],
    icon: Users,
  },
  {
    id: "nav-radar",
    title: "Radar Solar ANEEL",
    subtitle: "Mapeamento de usinas conectadas e prospecção por vizinhança",
    path: "/radar",
    keywords: [
      "radar",
      "solar",
      "aneel",
      "mapa",
      "usinas",
      "concorrencia",
      "prospeccao",
      "prospecção",
    ],
    icon: Compass,
    badge: "NOVO",
  },
  {
    id: "nav-faturas",
    title: "Análise de Faturas de Energia",
    subtitle: "Upload e leitura inteligente de contas de luz com dimensionamento",
    path: "/analise-faturas",
    keywords: [
      "fatura",
      "faturas",
      "conta",
      "luz",
      "energia",
      "copel",
      "ocr",
      "upload",
      "analise",
      "análise",
    ],
    icon: Receipt,
  },
  {
    id: "nav-perfil-integrador",
    title: "Perfil do Integrador & Parâmetros",
    subtitle: "Marcas homologadas, inversores, módulos e valor base por kWp",
    path: "/gestao/perfil-integrador",
    keywords: [
      "integrador",
      "perfil",
      "marcas",
      "inversores",
      "modulos",
      "módulos",
      "paineis",
      "painéis",
      "kwp",
      "potencia",
      "preço base",
      "dimensionamento",
      "tier",
    ],
    icon: SlidersHorizontal,
  },
  {
    id: "nav-templates",
    title: "Templates de Proposta",
    subtitle: "Personalize temas, capas e layouts visuais das propostas PDF",
    path: "/propostas/templates",
    keywords: [
      "templates",
      "template",
      "modelos",
      "designer",
      "documentos",
      "propostas",
      "personalizar",
      "capa",
    ],
    icon: Palette,
  },
  {
    id: "nav-estoque",
    title: "Estoque Próprio",
    subtitle: "Controle de saldo, custos e produtos em estoque",
    path: "/configuracoes/estoque",
    keywords: ["estoque", "produtos", "equipamentos", "saldo", "custo", "armazem", "reservas"],
    icon: Boxes,
  },
  {
    id: "nav-equipe",
    title: "Equipe & Colaboradores",
    subtitle: "Gestão de membros, vendedores e níveis de permissão",
    path: "/configuracoes/equipe",
    keywords: ["equipe", "usuarios", "usuários", "membros", "vendedores", "convidar", "acesso"],
    icon: UserPlus,
  },
  {
    id: "nav-organizacao",
    title: "Organização & Empresa",
    subtitle: "Dados cadastrais, logotipo oficial e configurações da integradora",
    path: "/configuracoes/organizacao",
    keywords: [
      "organizacao",
      "organização",
      "empresa",
      "cnpj",
      "dados",
      "logo",
      "integrador",
      "perfil",
    ],
    icon: Building2,
  },
  {
    id: "nav-planos",
    title: "Meus Planos & Assinatura",
    subtitle: "Recursos disponíveis, faturamento e assinatura do sistema",
    path: "/gestao/meus-planos",
    keywords: [
      "planos",
      "plano",
      "assinatura",
      "faturamento",
      "pagamento",
      "stripe",
      "mensalidade",
      "upgrade",
    ],
    icon: Crown,
  },
  {
    id: "nav-configuracoes",
    title: "Configurações Gerais",
    subtitle: "Preferências globais e opções do sistema",
    path: "/configuracoes",
    keywords: ["configuracoes", "configurações", "ajustes", "sistema", "geral"],
    icon: Settings,
  },
  {
    id: "nav-fornecedores",
    title: "Fornecedores & Distribuidores",
    subtitle: "Catálogo de parceiros de suprimentos e distribuidores",
    path: "/admin/distribuidores",
    keywords: ["fornecedores", "distribuidores", "distribuidor", "catalogo", "compras"],
    icon: Truck,
  },
  {
    id: "nav-produtos-globais",
    title: "Catálogo de Produtos Globais",
    subtitle: "Equipamentos, especificações técnicas e fichas de produtos",
    path: "/admin/produtos",
    keywords: ["produtos", "catalogo", "catálogo", "equipamentos", "especificacoes"],
    icon: Package,
  },
];

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Search;
  action: () => void;
  keywords: string[];
}

export type GlobalSearchHandle = {
  focus: () => void;
};

export interface GlobalSearchProps {
  onSelect?: () => void;
}

type UnifiedSearchResultItem =
  | { type: "action"; data: QuickAction }
  | { type: "nav"; data: NavItem }
  | { type: "proposal"; data: GlobalSearchProposalItem }
  | { type: "deal"; data: GlobalSearchDealItem }
  | { type: "lead"; data: GlobalSearchLeadItem };

export const GlobalSearch = forwardRef<GlobalSearchHandle, GlobalSearchProps>(
  function GlobalSearch(props, ref) {
    const { onSelect } = props;
    const router = useRouter();
    const { currentOrganizationId } = useOrganization();
    const shortcutMod = useShortcutMod();

    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);

    const [apiResults, setApiResults] = useState<{
      leads: GlobalSearchLeadItem[];
      proposals: GlobalSearchProposalItem[];
      deals: GlobalSearchDealItem[];
    }>({ leads: [], proposals: [], deals: [] });

    const inputRef = useRef<HTMLInputElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.select();
        setOpen(true);
      },
    }));

    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setDebounced(query.trim()), 180);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [query]);

    useEffect(() => {
      if (!currentOrganizationId) return;
      if (!debounced) {
        setApiResults({ leads: [], proposals: [], deals: [] });
        setLoading(false);
        return;
      }

      let cancelled = false;
      setLoading(true);

      fetchGlobalSearch(currentOrganizationId, debounced)
        .then((res) => {
          if (cancelled) return;
          setApiResults(res);
          setActiveIdx(0);
        })
        .catch(() => {
          if (!cancelled) setApiResults({ leads: [], proposals: [], deals: [] });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [currentOrganizationId, debounced]);

    useEffect(() => {
      if (!open) return;
      const handler = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!wrapRef.current || !target) return;
        if (!wrapRef.current.contains(target)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Quick Actions
    const quickActions = useMemo<QuickAction[]>(() => {
      return [
        {
          id: "action-new-lead",
          title: "Cadastrar Novo Cliente",
          subtitle: "Adicionar contato na base e iniciar funil de vendas",
          icon: UserPlus,
          keywords: ["novo", "cliente", "lead", "cadastrar", "adicionar", "contato"],
          action: () => router.push("/clientes"),
        },
        {
          id: "action-new-proposal",
          title: "Nova Proposta Comercial",
          subtitle: "Criar novo estudo ou proposta solar",
          icon: FilePlus,
          keywords: ["nova", "proposta", "criar", "estudo", "orcamento", "orçamento"],
          action: () => router.push("/propostas"),
        },
        {
          id: "action-analyze-bill",
          title: "Analisar Conta de Luz",
          subtitle: "Fazer upload de fatura para extração automática",
          icon: Receipt,
          keywords: ["analisar", "fatura", "conta", "luz", "copel", "upload", "extrair"],
          action: () => router.push("/analise-faturas"),
        },
        {
          id: "action-radar-map",
          title: "Explorar Radar Solar ANEEL",
          subtitle: "Ver usinas conectadas na região no mapa interativo",
          icon: Compass,
          keywords: ["radar", "mapa", "aneel", "usinas", "regiao", "região"],
          action: () => router.push("/radar"),
        },
      ];
    }, [router]);

    // Filter Navigation Pages based on query
    const matchingNavItems = useMemo(() => {
      if (!debounced) {
        return STATIC_NAV_ITEMS.slice(0, 5); // popular pages on empty query
      }
      const q = debounced.toLowerCase();
      return STATIC_NAV_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
      ).slice(0, 4);
    }, [debounced]);

    // Filter Quick Actions based on query
    const matchingActions = useMemo(() => {
      if (!debounced) {
        return quickActions.slice(0, 3);
      }
      const q = debounced.toLowerCase();
      return quickActions.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.includes(q))
      );
    }, [debounced, quickActions]);

    // Build unified item list for keyboard navigation and rendering
    const flatItems = useMemo<UnifiedSearchResultItem[]>(() => {
      const items: UnifiedSearchResultItem[] = [];

      // If user typed a query, show specific matches first (Proposals, Deals, Clients)
      if (debounced) {
        for (const p of apiResults.proposals) {
          items.push({ type: "proposal", data: p });
        }
        for (const d of apiResults.deals) {
          items.push({ type: "deal", data: d });
        }
        for (const l of apiResults.leads) {
          items.push({ type: "lead", data: l });
        }
        for (const n of matchingNavItems) {
          items.push({ type: "nav", data: n });
        }
        for (const a of matchingActions) {
          items.push({ type: "action", data: a });
        }
      } else {
        // Empty state: show quick actions and navigation shortcuts
        for (const a of matchingActions) {
          items.push({ type: "action", data: a });
        }
        for (const n of matchingNavItems) {
          items.push({ type: "nav", data: n });
        }
      }

      return items;
    }, [debounced, apiResults, matchingNavItems, matchingActions]);

    // Scroll active item into view
    useEffect(() => {
      if (!listRef.current) return;
      const activeEl = listRef.current.querySelector<HTMLElement>(
        `[data-search-idx="${activeIdx}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }, [activeIdx]);

    const handleSelect = useCallback(
      (item: UnifiedSearchResultItem) => {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        onSelect?.();

        switch (item.type) {
          case "action":
            item.data.action();
            break;
          case "nav":
            router.push(item.data.path);
            break;
          case "proposal":
            router.push(`/propostas/${item.data.id}`);
            break;
          case "deal":
            router.push(`/pipeline?id=${item.data.lead?.id || item.data.id}`);
            break;
          case "lead": {
            const stage = item.data.latestDealStage;
            const hasActiveDeal =
              Boolean(item.data.latestDealId) &&
              stage !== "WON" &&
              stage !== "LOST" &&
              stage !== null;
            if (hasActiveDeal) {
              router.push(`/pipeline?id=${item.data.id}`);
            } else {
              router.push(`/clientes/${item.data.id}`);
            }
            break;
          }
        }
      },
      [router, onSelect]
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
        return;
      }
      if (!open || flatItems.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIdx((idx) => (idx + 1) % flatItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIdx((idx) => (idx - 1 + flatItems.length) % flatItems.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = flatItems[activeIdx];
        if (selected) handleSelect(selected);
      }
    };

    return (
      <div ref={wrapRef} className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar clientes, negociações, propostas ou páginas..."
          className="h-9 w-full rounded-xl border border-black/[0.08] dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] pl-9 pr-16 text-sm text-[var(--color-foreground)] backdrop-blur-md transition-all duration-200 placeholder:text-[var(--color-muted-foreground)] hover:bg-black/[0.05] dark:hover:bg-white/[0.09] hover:border-black/15 dark:hover:border-white/25 focus:bg-white/80 dark:focus:bg-white/[0.12] focus:border-emerald-500/60 dark:focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 shadow-xs focus:shadow-md"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-black/[0.05] dark:hover:bg-white/10 hover:text-[var(--color-foreground)]"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : shortcutMod ? (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md border border-black/[0.08] dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)] shadow-xs backdrop-blur-xs">
            {shortcutMod}K
          </kbd>
        ) : null}

        {open ? (
          <div className="absolute left-0 sm:-left-4 right-0 sm:right-auto sm:w-[580px] top-[calc(100%+8px)] z-[80] overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/15 bg-white/95 dark:bg-[#161d22]/95 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header info / status */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 px-4 py-2 text-[11px] font-medium text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1.5">
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span>Pesquisando no sistema...</span>
                  </>
                ) : debounced ? (
                  <span>
                    Resultados para &ldquo;
                    <strong className="text-[var(--color-foreground)]">{debounced}</strong>&rdquo;
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Acesso rápido e comandos</span>
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-[10px] text-[var(--color-muted-foreground)]">
                Navegue com ↑ ↓ e pressione Enter
              </span>
            </div>

            {/* List */}
            {flatItems.length === 0 && !loading ? (
              <div className="px-6 py-10 text-center">
                <Search className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)] opacity-40 mb-2" />
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  Nenhum resultado encontrado
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Tente buscar por nome de cliente, telefone, número da proposta (#1042) ou página.
                </p>
              </div>
            ) : (
              <ul ref={listRef} className="max-h-[460px] overflow-y-auto p-2 space-y-1">
                {/* 1. Propostas Section */}
                {apiResults.proposals.length > 0 && (
                  <li className="pt-1 pb-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center justify-between">
                      <span>Propostas Comerciais</span>
                      <span className="rounded-full bg-[var(--color-muted)] px-1.5 py-0.2 text-[10px]">
                        {apiResults.proposals.length}
                      </span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {apiResults.proposals.map((p) => {
                        const itemIdx = flatItems.findIndex(
                          (it) => it.type === "proposal" && it.data.id === p.id
                        );
                        const isSelected = itemIdx === activeIdx;
                        const statusLabel = PROPOSAL_STATUS_LABEL[p.status] ?? p.status;
                        const statusClass =
                          PROPOSAL_STATUS_CLASS[p.status] ?? PROPOSAL_STATUS_CLASS["DRAFT"];
                        const formattedVal = formatBrl(p.quotedValueBrl);

                        return (
                          <button
                            key={`prop-${p.id}`}
                            type="button"
                            data-search-idx={itemIdx}
                            onMouseEnter={() => setActiveIdx(itemIdx)}
                            onClick={() => handleSelect(flatItems[itemIdx]!)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? "bg-[var(--color-muted)] shadow-xs ring-1 ring-[var(--color-border)]"
                                : "hover:bg-[var(--color-muted)]/60"
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold text-xs border border-violet-200 dark:border-violet-800">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[var(--color-foreground)] truncate">
                                  {p.proposalNumber ? `#${p.proposalNumber} · ` : ""}
                                  {p.title}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                                {p.deal?.lead ? (
                                  <span className="font-medium text-[var(--color-foreground)]/80">
                                    {p.deal.lead.name}
                                  </span>
                                ) : null}
                                {formattedVal ? (
                                  <>
                                    <span>·</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                      {formattedVal}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-opacity ${isSelected ? "text-violet-600 dark:text-violet-400 opacity-100" : "opacity-0"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}

                {/* 2. Negociações (Deals) Section */}
                {apiResults.deals.length > 0 && (
                  <li className="pt-2 pb-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center justify-between">
                      <span>Negociações no Funil</span>
                      <span className="rounded-full bg-[var(--color-muted)] px-1.5 py-0.2 text-[10px]">
                        {apiResults.deals.length}
                      </span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {apiResults.deals.map((d) => {
                        const itemIdx = flatItems.findIndex(
                          (it) => it.type === "deal" && it.data.id === d.id
                        );
                        const isSelected = itemIdx === activeIdx;
                        const stageLabel = STAGE_LABEL[d.stage] ?? d.stage;
                        const stageClass = STAGE_PILL_CLASS[d.stage] ?? STAGE_PILL_CLASS["NEW"];
                        const formattedVal = formatBrl(d.value);

                        return (
                          <button
                            key={`deal-${d.id}`}
                            type="button"
                            data-search-idx={itemIdx}
                            onMouseEnter={() => setActiveIdx(itemIdx)}
                            onClick={() => handleSelect(flatItems[itemIdx]!)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? "bg-[var(--color-muted)] shadow-xs ring-1 ring-[var(--color-border)]"
                                : "hover:bg-[var(--color-muted)]/60"
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800">
                              <Handshake className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[var(--color-foreground)] truncate">
                                  {d.title}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageClass}`}
                                >
                                  {stageLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                                <span className="font-medium text-[var(--color-foreground)]/80">
                                  {d.lead.name}
                                </span>
                                {d.lead.company ? (
                                  <>
                                    <span>·</span>
                                    <span>{d.lead.company}</span>
                                  </>
                                ) : null}
                                {formattedVal ? (
                                  <>
                                    <span>·</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                      {formattedVal}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-opacity ${isSelected ? "text-amber-600 dark:text-amber-400 opacity-100" : "opacity-0"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}

                {/* 3. Clientes (Leads) Section */}
                {apiResults.leads.length > 0 && (
                  <li className="pt-2 pb-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center justify-between">
                      <span>Clientes & Leads</span>
                      <span className="rounded-full bg-[var(--color-muted)] px-1.5 py-0.2 text-[10px]">
                        {apiResults.leads.length}
                      </span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {apiResults.leads.map((l) => {
                        const itemIdx = flatItems.findIndex(
                          (it) => it.type === "lead" && it.data.id === l.id
                        );
                        const isSelected = itemIdx === activeIdx;
                        const stage = l.latestDealStage ?? "NEW";
                        const stageLabel = STAGE_LABEL[stage] ?? stage;
                        const stageClass = STAGE_PILL_CLASS[stage] ?? STAGE_PILL_CLASS["NEW"];
                        const phone = formatWhatsapp(l.whatsapp);
                        const initials = (l.name || "L")
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase();

                        return (
                          <button
                            key={`lead-${l.id}`}
                            type="button"
                            data-search-idx={itemIdx}
                            onMouseEnter={() => setActiveIdx(itemIdx)}
                            onClick={() => handleSelect(flatItems[itemIdx]!)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? "bg-[var(--color-muted)] shadow-xs ring-1 ring-[var(--color-border)]"
                                : "hover:bg-[var(--color-muted)]/60"
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                              {initials || <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[var(--color-foreground)] truncate">
                                  {l.name}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageClass}`}
                                >
                                  {stageLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                                <span>{phone ?? l.email ?? "Sem telefone"}</span>
                                {l.company ? (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{l.company}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-opacity ${isSelected ? "text-emerald-600 dark:text-emerald-400 opacity-100" : "opacity-0"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}

                {/* 4. Navegação & Módulos Section */}
                {matchingNavItems.length > 0 && (
                  <li className="pt-2 pb-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      <span>Páginas & Recursos</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {matchingNavItems.map((n) => {
                        const itemIdx = flatItems.findIndex(
                          (it) => it.type === "nav" && it.data.id === n.id
                        );
                        const isSelected = itemIdx === activeIdx;
                        const Icon = n.icon;

                        return (
                          <button
                            key={n.id}
                            type="button"
                            data-search-idx={itemIdx}
                            onMouseEnter={() => setActiveIdx(itemIdx)}
                            onClick={() => handleSelect(flatItems[itemIdx]!)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                              isSelected
                                ? "bg-[var(--color-muted)] shadow-xs ring-1 ring-[var(--color-border)]"
                                : "hover:bg-[var(--color-muted)]/60"
                            }`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)]">
                              <Icon className="h-4 w-4 opacity-80" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[var(--color-foreground)] truncate">
                                  {n.title}
                                </span>
                                {n.badge && (
                                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {n.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                                {n.subtitle}
                              </p>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-opacity ${isSelected ? "text-[var(--color-foreground)] opacity-100" : "opacity-0"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}

                {/* 5. Ações Rápidas Section */}
                {matchingActions.length > 0 && (
                  <li className="pt-2 pb-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      <span>Ações Rápidas</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {matchingActions.map((a) => {
                        const itemIdx = flatItems.findIndex(
                          (it) => it.type === "action" && it.data.id === a.id
                        );
                        const isSelected = itemIdx === activeIdx;
                        const Icon = a.icon;

                        return (
                          <button
                            key={a.id}
                            type="button"
                            data-search-idx={itemIdx}
                            onMouseEnter={() => setActiveIdx(itemIdx)}
                            onClick={() => handleSelect(flatItems[itemIdx]!)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                              isSelected
                                ? "bg-[var(--color-muted)] shadow-xs ring-1 ring-[var(--color-border)]"
                                : "hover:bg-[var(--color-muted)]/60"
                            }`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-sm text-[var(--color-foreground)] truncate block">
                                {a.title}
                              </span>
                              <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                                {a.subtitle}
                              </p>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 shrink-0 transition-opacity ${isSelected ? "text-emerald-600 dark:text-emerald-400 opacity-100" : "opacity-0"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    );
  }
);
