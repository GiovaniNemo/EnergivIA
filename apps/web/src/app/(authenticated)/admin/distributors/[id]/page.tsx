"use client";

import { useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Paper, TextField, Alert, CircularProgress, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { distributorSchema, type DistributorFormValues } from "@/lib/admin/schemas";
import {
  fetchDistributor,
  fetchDistributorFreight,
  saveDistributorFreight,
  updateDistributor,
  type FreightRuleRow,
} from "@/lib/admin-api";
import { FreightRulesEditor } from "@/components/freight/freight-rules-editor";

export default function EditDistributorPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useMemo(() => params["id"] as string, [params]);

  const {
    data: distributor,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "distributors", id],
    queryFn: () => fetchDistributor(id),
    enabled: Boolean(id),
  });

  const { control, handleSubmit, formState } = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
    values: distributor
      ? {
          name: distributor.name,
          cnpj: distributor.cnpj ?? "",
          email: distributor.email ?? "",
          phone: distributor.phone ?? "",
          website: distributor.website ?? "",
          city: distributor.city ?? "",
          state: distributor.state ?? "",
        }
      : undefined,
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      website: "",
      city: "",
      state: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DistributorFormValues) => updateDistributor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors", id] });
    },
  });

  const loadFreight = useCallback(() => fetchDistributorFreight(id), [id]);
  const saveFreight = useCallback(
    (rules: FreightRuleRow[]) => saveDistributorFreight(id, rules),
    [id]
  );

  if (isLoading || !distributor) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        Distribuidor não encontrado.{" "}
        <Button size="small" onClick={() => router.push("/admin/distribuidores")}>
          Voltar
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 920, display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Typography variant="h2" sx={{ fontSize: "1.25rem", fontWeight: 600, mb: 2 }}>
          Editar distribuidor
        </Typography>
        <Box component="form" onSubmit={handleSubmit((v) => updateMutation.mutate(v))}>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Nome"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="cnpj"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="CNPJ"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="email"
                label="E-mail"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Telefone"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="website"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Website"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Controller
              name="city"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Cidade"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  fullWidth
                  size="small"
                />
              )}
            />
            <Controller
              name="state"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Estado"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  fullWidth
                  size="small"
                />
              )}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
            <Button onClick={() => router.push(`/admin/distribuidores/${id}/products`)}>
              Ver estoque
            </Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={() => router.push("/admin/distribuidores")}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!formState.isDirty || updateMutation.isPending}
              >
                Salvar
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
      <FreightRulesEditor
        description="Valor fixo de frete por UF de destino desta distribuidora — aplicado nas propostas cujo kit vem dela."
        load={loadFreight}
        save={saveFreight}
      />
    </Box>
  );
}
