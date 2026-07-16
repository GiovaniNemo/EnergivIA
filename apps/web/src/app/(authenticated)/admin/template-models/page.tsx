"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Alert, Typography, Paper, IconButton, Chip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  adminListTemplateBlueprints,
  adminDeleteTemplateBlueprint,
  type TemplateBlueprintAdminRow,
} from "@/lib/template-blueprints-api";

export default function AdminTemplateModelsPage(): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "template-blueprints", currentOrganizationId],
    queryFn: () => adminListTemplateBlueprints(currentOrganizationId!),
    enabled: Boolean(currentOrganizationId),
  });

  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => adminDeleteTemplateBlueprint(currentOrganizationId!, rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "template-blueprints", currentOrganizationId],
      });
    },
  });

  const columns: GridColDef<TemplateBlueprintAdminRow>[] = useMemo(
    () => [
      { field: "name", headerName: "Nome", flex: 1, minWidth: 200 },
      {
        field: "published",
        headerName: "Status",
        width: 120,
        renderCell: (p: GridRenderCellParams<TemplateBlueprintAdminRow>) => (
          <Chip
            size="small"
            label={p.row.published ? "Publicado" : "Rascunho"}
            color={p.row.published ? "success" : "default"}
            variant={p.row.published ? "filled" : "outlined"}
          />
        ),
      },
      { field: "sortOrder", headerName: "Ordem", width: 90, type: "number" },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (p: GridRenderCellParams<TemplateBlueprintAdminRow>) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              component={Link}
              href={`/admin/modelos-template/${p.row.id}`}
              size="small"
              aria-label="Editar"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Excluir"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    `Excluir o modelo "${p.row.name}"? Esta ação não pode ser desfeita.`
                  )
                ) {
                  deleteMutation.mutate(p.row.id);
                }
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [deleteMutation.isPending]
  );

  if (!currentOrganizationId) {
    return (
      <Alert severity="info">
        Selecione uma organização no menu superior para gerenciar modelos de template.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h2" sx={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Modelos de template
        </Typography>
        <Button
          component={Link}
          href="/admin/modelos-template/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Novo modelo
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Modelos publicados aparecem no fluxo de importação do editor de propostas para todas as
        organizações (usuários autenticados). Apenas proprietários e administradores da organização
        atual podem criar ou editar registros.
      </Typography>

      {isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : "Falha ao carregar modelos."}
        </Alert>
      ) : null}

      {deleteMutation.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "Falha ao excluir."}
        </Alert>
      ) : null}

      <Paper sx={{ height: 520, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Paper>
    </Box>
  );
}
