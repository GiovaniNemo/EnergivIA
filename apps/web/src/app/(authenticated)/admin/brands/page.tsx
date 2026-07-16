"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, type BrandFormValues } from "@/lib/admin/schemas";
import { fetchBrands, createBrand, updateBrand, type Brand } from "@/lib/admin-api";
import { ImageUpload } from "@/components/admin/products/ImageUpload";

export default function AdminBrandsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: fetchBrands,
  });

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "", country: "", image_url: "" },
  });

  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setDialogOpen(false);
      form.reset({ name: "", country: "", image_url: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; country?: string; image_url?: string };
    }) => updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setEditingBrand(null);
      form.reset({ name: "", country: "", image_url: "" });
    },
  });

  const handleOpenCreate = () => {
    setEditingBrand(null);
    form.reset({ name: "", country: "", image_url: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({ name: brand.name, country: brand.country ?? "", image_url: brand.imageUrl ?? "" });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingBrand(null);
    form.reset({ name: "", country: "", image_url: "" });
  };

  const onSubmit = (values: BrandFormValues) => {
    const normalizedImageUrl = values.image_url?.trim() ?? "";
    const payload = {
      ...values,
      country: values.country?.trim() || undefined,
      image_url: normalizedImageUrl,
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          size="medium"
        >
          Nova marca
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>País</TableCell>
                <TableCell align="right">Produtos</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{ py: 4, textAlign: "center", color: "text.secondary" }}
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>{brand.name}</TableCell>
                    <TableCell>{brand.country ?? "—"}</TableCell>
                    <TableCell align="right">
                      {"_count" in brand &&
                      typeof (brand as Brand & { _count?: { products: number } })._count
                        ?.products === "number"
                        ? (brand as Brand & { _count: { products: number } })._count.products
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(brand)}
                        aria-label="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.25rem" }}>
          {editingBrand ? "Editar marca" : "Nova marca"}
        </DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                  />
                )}
              />
              <Controller
                name="country"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="País"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    fullWidth
                    size="small"
                  />
                )}
              />
              <Controller
                name="image_url"
                control={form.control}
                render={({ field }) => (
                  <ImageUpload
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(url) => field.onChange(url)}
                    folder="brands"
                    label="Logo da marca"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingBrand ? "Salvar" : "Criar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
