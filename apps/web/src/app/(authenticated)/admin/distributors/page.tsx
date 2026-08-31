"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Typography,
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
  Chip,
  Avatar,
  Tooltip,
  Grid,
  InputAdornment,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory";
import SettingsIcon from "@mui/icons-material/Settings";
import SyncIcon from "@mui/icons-material/Sync";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SearchIcon from "@mui/icons-material/Search";
import BoltIcon from "@mui/icons-material/Bolt";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  fetchDistributors,
  deleteDistributor,
  updateDistributor,
  syncDistributorCatalog,
  uploadDistributorSpreadsheet,
  type Distributor,
} from "@/lib/admin-api";

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

  const handleDelete = (d: Distributor) => {
    if (
      window.confirm(
        `Excluir distribuidor "${d.name}"? Esta ação removerá os produtos vinculados a ele.`
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(id);
      const res = await uploadDistributorSpreadsheet(id, file);
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
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
          sx={{ color: "text.secondary" }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem
            onClick={() => {
              handleClose();
              router.push(`/admin/distribuidores/${d.id}/products`);
            }}
          >
            <ListItemIcon>
              <InventoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Gerenciar Catálogo & Preços</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose();
              handleOpenIntegration(d);
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Credenciais da API</ListItemText>
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
                {syncing === d.id ? <CircularProgress size={18} /> : <SyncIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText>Sincronizar API Agora</ListItemText>
            </MenuItem>
          )}
          <MenuItem component="label" disabled={uploading === d.id}>
            <ListItemIcon>
              {uploading === d.id ? (
                <CircularProgress size={18} />
              ) : (
                <CloudUploadIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>Importar Planilha Excel (.xlsx)</ListItemText>
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
          <Divider />
          <MenuItem
            onClick={() => {
              handleClose();
              router.push(`/admin/distribuidores/${d.id}`);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar Cadastro & Frete</ListItemText>
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
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Excluir Distribuidor</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* KPI Stats */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main", color: "#fff", width: 44, height: 44 }}>
              <BusinessOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Distribuidores Parceiros
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "success.main", color: "#fff", width: 44, height: 44 }}>
              <BoltIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Com Sincronização API Ativa
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.withApi}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "info.main", color: "#fff", width: 44, height: 44 }}>
              <TableChartOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Ofertas & Preços em Catálogo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.totalItems}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Search & Actions */}
      <Box
        display="flex"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        alignItems="center"
      >
        <TextField
          placeholder="Pesquisar por nome, CNPJ ou cidade..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 300, bgcolor: "background.paper" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/admin/distribuidores/new")}
          size="medium"
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Adicionar Distribuidor
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" variant="filled">
          Não foi possível carregar os distribuidores. {error instanceof Error ? error.message : ""}
        </Alert>
      )}

      {/* Distributors Table */}
      <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Distribuidor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Integração / Fonte</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>CNPJ / Contato</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Localização</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Itens Vinculados
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
                  >
                    Carregando distribuidores…
                  </TableCell>
                </TableRow>
              ) : filteredDistributors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <LocalShippingOutlinedIcon
                        sx={{ fontSize: 48, color: "action.disabled", mb: 1 }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Nenhum distribuidor encontrado
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        Cadastre os distribuidores parceiros para cotar e precificar kits
                        automaticamente.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => router.push("/admin/distribuidores/new")}
                        sx={{ textTransform: "none" }}
                      >
                        Adicionar Distribuidor
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDistributors.map((d) => {
                  const itemCount = d._count?.distributorProducts ?? 0;
                  const isApiActive = Boolean(d.integrationProvider);

                  return (
                    <TableRow
                      key={d.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: isApiActive ? "primary.dark" : "action.selected",
                              color: isApiActive ? "#fff" : "text.primary",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            {d.name.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {d.name}
                            </Typography>
                            {d.website && (
                              <Typography variant="caption" color="text.secondary">
                                {d.website}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isApiActive ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon fontSize="small" />}
                            label={`API ${d.integrationProvider}`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            label="Planilha / Manual"
                            size="small"
                            variant="outlined"
                            sx={{ color: "text.secondary" }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{d.cnpj || "—"}</Typography>
                        {d.email && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {d.email}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {d.city ? `${d.city} - ${d.state || ""}` : d.state || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`Ver catálogo e preços de ${d.name}`}>
                          <Chip
                            label={`${itemCount} item(ns)`}
                            size="small"
                            color={itemCount > 0 ? "primary" : "default"}
                            variant={itemCount > 0 ? "filled" : "outlined"}
                            onClick={() => router.push(`/admin/distribuidores/${d.id}/products`)}
                            deleteIcon={<ArrowForwardIcon fontSize="small" />}
                            onDelete={() => router.push(`/admin/distribuidores/${d.id}/products`)}
                            sx={{ cursor: "pointer", fontWeight: 600 }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <RowActions d={d} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Integration Modal */}
      <Dialog
        open={integrationDialog.open}
        onClose={() => setIntegrationDialog({ open: false, distributor: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Integração API {integrationDialog.distributor?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2.5 }}>
            A integração automática sincroniza estoques, preços atualizados e produtos sem
            necessidade de envio manual de planilhas.
          </Alert>
          <TextField
            label="API Key / Token de Acesso"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="Insira a chave fornecida pelo distribuidor"
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
        <DialogActions sx={{ px: 3, py: 2 }}>
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
    </Box>
  );
}
