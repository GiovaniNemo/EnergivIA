"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Truck,
  Zap,
  BarChart3,
  Search,
  Plus,
  MoreVertical,
  Boxes,
  Key,
  RefreshCw,
  UploadCloud,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import {
  fetchDistributors,
  deleteDistributor,
  updateDistributor,
  syncDistributorCatalog,
  uploadDistributorSpreadsheet,
  type Distributor,
  type DistributorImportLog,
} from "@/lib/admin-api";
import { ImportAuditModal } from "@/components/admin/distributors/ImportAuditModal";

export default function AdminDistributorsPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: distributors = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "distributors"],
    queryFn: fetchDistributors,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDistributor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateDistributor(id, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "distributors"] });
      const previousDistributors = queryClient.getQueryData<Distributor[]>([
        "admin",
        "distributors",
      ]);
      queryClient.setQueryData<Distributor[]>(["admin", "distributors"], (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, active } : item))
      );
      return { previousDistributors };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousDistributors) {
        queryClient.setQueryData(["admin", "distributors"], context.previousDistributors);
      }
      alert("Erro ao alterar status do fornecedor: " + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
    },
  });

  const handleDelete = (d: Distributor) => {
    if (
      window.confirm(
        `Excluir fornecedor "${d.name}"? Esta ação removerá os produtos vinculados a ele.`
      )
    ) {
      deleteMutation.mutate(d.id);
    }
  };

  const [integrationDialog, setIntegrationDialog] = useState<{
    open: boolean;
    distributor: Distributor | null;
  }>({
    open: false,
    distributor: null,
  });
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const saveIntegrationMutation = useMutation({
    mutationFn: (data: { id: string; apiKey: string; secret: string }) =>
      updateDistributor(data.id, {
        integrationProvider: "EDELTEC",
        apiCredentials: { apiKey: data.apiKey, secret: data.secret },
      } as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      setIntegrationDialog({ open: false, distributor: null });
      alert("Integração salva com sucesso!");
    },
    onError: (err: Error) => {
      alert("Erro ao salvar integração: " + err.message);
    },
  });

  const handleOpenIntegration = (d: Distributor) => {
    const creds = d.apiCredentials as Record<string, unknown> | null | undefined;
    setApiKey((creds?.["apiKey"] as string) || "");
    setApiSecret((creds?.["secret"] as string) || "");
    setIntegrationDialog({ open: true, distributor: d });
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      const res = await syncDistributorCatalog(id);
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Desconhecido";
      alert("Erro ao sincronizar: " + msg);
    } finally {
      setSyncing(null);
    }
  };

  const [uploading, setUploading] = useState<string | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditDistributor, setAuditDistributor] = useState<{ id: string; name: string } | null>(
    null
  );
  const [auditLogData, setAuditLogData] = useState<DistributorImportLog | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(id);
      const res = await uploadDistributorSpreadsheet(id, file);
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      const currentDist = distributors.find((d) => d.id === id);
      setAuditDistributor({ id, name: currentDist?.name || "Fornecedor" });
      if (res.summary && res.details) {
        setAuditLogData({
          id: res.logId || id,
          distributorId: id,
          fileName: file.name,
          summary: res.summary,
          details: res.details,
          createdAt: new Date().toISOString(),
        });
      } else {
        setAuditLogData(null);
      }
      setAuditModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Desconhecido";
      alert("Erro ao enviar planilha: " + msg);
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = distributors.length;
    const withApi = distributors.filter((d) => Boolean(d.integrationProvider)).length;
    let totalItems = 0;
    distributors.forEach((d) => {
      if (d._count?.distributorProducts) totalItems += d._count.distributorProducts;
    });
    return {
      total,
      withApi,
      totalItems,
    };
  }, [distributors]);

  const filteredDistributors = useMemo(() => {
    return distributors.filter((d) => {
      const term = searchTerm.toLowerCase();
      return (
        d.name.toLowerCase().includes(term) ||
        (d.cnpj && d.cnpj.toLowerCase().includes(term)) ||
        (d.city && d.city.toLowerCase().includes(term)) ||
        (d.state && d.state.toLowerCase().includes(term))
      );
    });
  }, [distributors, searchTerm]);

  const RowActions = ({ d }: { d: Distributor }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };

    return (
      <>
        <IconButton
          size="small"
          onClick={handleClick}
          aria-label="Mais ações"
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <MoreVertical className="h-4 w-4" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          PaperProps={{
            sx: {
              bgcolor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
              color: "text.primary",
              minWidth: 220,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              handleClose();
              router.push(`/admin/distribuidores/${d.id}/products`);
            }}
          >
            <ListItemIcon>
              <Boxes className="h-4 w-4 text-emerald-400" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Catálogo & Preços
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose();
              handleOpenIntegration(d);
            }}
          >
            <ListItemIcon>
              <Key className="h-4 w-4 text-blue-400" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Credenciais da API
            </ListItemText>
          </MenuItem>
          {d.integrationProvider && (
            <MenuItem
              onClick={() => {
                handleClose();
                handleSync(d.id);
              }}
              disabled={syncing === d.id}
            >
              <ListItemIcon>
                {syncing === d.id ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshCw className="h-4 w-4 text-emerald-400" />
                )}
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
                Sincronizar API Agora
              </ListItemText>
            </MenuItem>
          )}
          <MenuItem component="label" disabled={uploading === d.id}>
            <ListItemIcon>
              {uploading === d.id ? (
                <CircularProgress size={16} />
              ) : (
                <UploadCloud className="h-4 w-4 text-purple-400" />
              )}
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Importar Planilha (.xlsx)
            </ListItemText>
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={(e) => {
                handleClose();
                handleFileUpload(e, d.id);
              }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose();
              setAuditDistributor({ id: d.id, name: d.name });
              setAuditLogData(null);
              setAuditModalOpen(true);
            }}
          >
            <ListItemIcon>
              <FileText className="h-4 w-4 text-zinc-400" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Relatório de Importação
            </ListItemText>
          </MenuItem>
          <Divider sx={{ borderColor: "var(--color-border)" }} />
          <MenuItem
            onClick={() => {
              handleClose();
              router.push(`/admin/distribuidores/${d.id}`);
            }}
          >
            <ListItemIcon>
              <Pencil className="h-4 w-4 text-zinc-400" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Editar Cadastro
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose();
              handleDelete(d);
            }}
            disabled={deleteMutation.isPending}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <Trash2 className="h-4 w-4" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Excluir Fornecedor
            </ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Fornecedores Parceiros
            </p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Com API Integrada
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats.withApi}</span>
              <span className="text-xs text-zinc-400">
                ({stats.total > 0 ? Math.round((stats.withApi / stats.total) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Ofertas em Catálogo
            </p>
            <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, CNPJ ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => router.push("/admin/distribuidores/new")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-950 transition-all hover:bg-emerald-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar Fornecedor</span>
        </button>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Não foi possível carregar os fornecedores. {error instanceof Error ? error.message : ""}
        </div>
      )}

      {/* Distributors Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Fornecedor</th>
                <th className="px-5 py-3.5 font-semibold">Integração / Fonte</th>
                <th className="px-5 py-3.5 font-semibold">CNPJ / Contato</th>
                <th className="px-5 py-3.5 font-semibold">Localização</th>
                <th className="px-5 py-3.5 text-center font-semibold">Itens</th>
                <th className="px-5 py-3.5 text-center font-semibold">Cotações</th>
                <th className="px-5 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <CircularProgress size={24} className="mb-2 text-emerald-400" />
                    <p>Carregando fornecedores parceiros...</p>
                  </td>
                </tr>
              ) : filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <Truck className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="font-medium text-white">Nenhum fornecedor encontrado</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Cadastre fornecedores parceiros para cotar kits automaticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDistributors.map((d) => {
                  const itemCount = d._count?.distributorProducts ?? 0;
                  const isApiActive = Boolean(d.integrationProvider);
                  const isCotacaoActive = d.active !== false;

                  return (
                    <tr
                      key={d.id}
                      className={`group transition-colors ${
                        isCotacaoActive ? "hover:bg-white/[0.02]" : "opacity-60 bg-black/10"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold text-sm border ${
                              isApiActive
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700/60"
                            }`}
                          >
                            {d.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              {d.name}
                            </p>
                            {d.website && (
                              <a
                                href={
                                  d.website.startsWith("http") ? d.website : `https://${d.website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                              >
                                <span>{d.website.replace(/^https?:\/\//i, "")}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {isApiActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            API {d.integrationProvider}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-400">
                            Planilha / Manual
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-zinc-300 font-mono text-xs">{d.cnpj || "—"}</p>
                        {d.email && <p className="text-xs text-zinc-500 mt-0.5">{d.email}</p>}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                          <span>
                            {d.city ? `${d.city} - ${d.state || ""}` : d.state || "Brasil"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => router.push(`/admin/distribuidores/${d.id}/products`)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            itemCount > 0
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          <span>
                            {itemCount} {itemCount === 1 ? "oferta" : "ofertas"}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: d.id,
                              active: !isCotacaoActive,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            isCotacaoActive
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700/60 hover:text-white"
                          }`}
                        >
                          {isCotacaoActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <span>Pausado</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <RowActions d={d} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Modal */}
      <Dialog
        open={integrationDialog.open}
        onClose={() => setIntegrationDialog({ open: false, distributor: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, bgcolor: "background.paper", color: "text.primary" }}>
          Integração API {integrationDialog.distributor?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, bgcolor: "background.paper" }}>
          <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-200">
            A integração automática sincroniza estoques, preços atualizados e produtos sem
            necessidade de envio manual de planilhas.
          </div>
          <TextField
            label="API Key / Token de Acesso"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="Insira a chave fornecida pelo fornecedor"
          />
          <TextField
            label="API Secret / Chave Privada"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            type="password"
            placeholder="Insira a chave secreta"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: "background.paper" }}>
          <Button
            onClick={() => setIntegrationDialog({ open: false, distributor: null })}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={saveIntegrationMutation.isPending}
            onClick={() =>
              integrationDialog.distributor &&
              saveIntegrationMutation.mutate({
                id: integrationDialog.distributor.id,
                apiKey,
                secret: apiSecret,
              })
            }
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {saveIntegrationMutation.isPending ? "Salvando..." : "Salvar e Ativar Integração"}
          </Button>
        </DialogActions>
      </Dialog>

      {auditDistributor && (
        <ImportAuditModal
          open={auditModalOpen}
          onClose={() => {
            setAuditModalOpen(false);
            setAuditDistributor(null);
            setAuditLogData(null);
          }}
          distributorId={auditDistributor.id}
          distributorName={auditDistributor.name}
          initialLog={auditLogData}
          onBrandUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
          }}
        />
      )}
    </div>
  );
}
