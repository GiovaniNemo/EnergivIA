"use client";

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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { fetchDistributors, deleteDistributor, type Distributor } from "@/lib/admin-api";

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
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/distribuidores/${d.id}/products`)}
                        aria-label="Estoque"
                        title="Ver estoque"
                      >
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/distribuidores/${d.id}`)}
                        aria-label="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(d)}
                        aria-label="Excluir"
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
