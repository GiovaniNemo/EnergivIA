"use client";
import { useState } from "react";
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
    if (window.confirm(`Excluir distribuidor "${d.name}"? Esta ação não pode ser desfeita.`)) {
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
      e.target.value = ""; // Reset input
    }
  };

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
        <IconButton size="small" onClick={handleClick} aria-label="Mais ações">
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem
            onClick={() => {
              handleClose();
              router.push(`/admin/distribuidores/${d.id}/products`);
            }}
          >
            <ListItemIcon>
              <InventoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Estoque e Produtos</ListItemText>
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
            <ListItemText>Configurar API Edeltec</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleClose();
              handleSync(d.id);
            }}
            disabled={syncing === d.id || !d.integrationProvider}
          >
            <ListItemIcon>
              {syncing === d.id ? <CircularProgress size={20} /> : <SyncIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>Sincronizar via API</ListItemText>
          </MenuItem>
          <MenuItem component="label" disabled={uploading === d.id}>
            <ListItemIcon>
              {uploading === d.id ? <CircularProgress size={20} /> : <CloudUploadIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>Importar Planilha</ListItemText>
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
              router.push(`/admin/distribuidores/${d.id}`);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
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
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/admin/distribuidores/new")}
          size="medium"
        >
          Adicionar distribuidor
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }} variant="filled">
          Não foi possível carregar os distribuidores. {error instanceof Error ? error.message : ""}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Cidade</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Produtos</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : distributors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <LocalShippingOutlinedIcon
                        sx={{ fontSize: 48, color: "action.disabled", mb: 1 }}
                      />
                      <Typography variant="body1" color="text.secondary">
                        Nenhum distribuidor cadastrado
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Use o botão acima para adicionar o primeiro distribuidor.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => router.push("/admin/distribuidores/new")}
                        sx={{ mt: 2 }}
                      >
                        Adicionar distribuidor
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                distributors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.cnpj ?? "—"}</TableCell>
                    <TableCell>{d.city ?? "—"}</TableCell>
                    <TableCell>{d.state ?? "—"}</TableCell>
                    <TableCell align="right">
                      {"_count" in d &&
                      typeof (d as Distributor & { _count?: { distributorProducts: number } })
                        ._count?.distributorProducts === "number"
                        ? (d as Distributor & { _count: { distributorProducts: number } })._count
                            .distributorProducts
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <RowActions d={d} />
                    </TableCell>
                  </TableRow>
                ))
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
        <DialogTitle>Integração Edeltec</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Insira as credenciais da API da Edeltec para sincronização automática de produtos e
            preços de integrador.
          </Typography>
          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />
          <TextField
            label="API Secret"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            type="password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationDialog({ open: false, distributor: null })}>
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
          >
            {saveIntegrationMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
