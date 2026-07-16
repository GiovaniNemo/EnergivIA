"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { distributorSchema, type DistributorFormValues } from "@/lib/admin/schemas";
import { createDistributor } from "@/lib/admin-api";

export default function NewDistributorPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState } = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
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

  const createMutation = useMutation({
    mutationFn: createDistributor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "distributors"] });
      router.push("/admin/distribuidores");
    },
  });

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
      <Typography variant="h2" sx={{ fontSize: "1.25rem", fontWeight: 600, mb: 2 }}>
        Novo distribuidor
      </Typography>
      <Box component="form" onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={() => router.push("/admin/distribuidores")}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!formState.isDirty || createMutation.isPending}
          >
            Criar distribuidor
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
