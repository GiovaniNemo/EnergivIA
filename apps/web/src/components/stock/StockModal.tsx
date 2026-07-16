"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { Loader2, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  createStockItem,
  updateStockItem,
  searchStockProducts,
  type StockItemRow,
  type StockProductOption,
} from "@/lib/stock-api";

interface StockModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  editing: StockItemRow | null;
  onSaved: () => void;
  onError: (message: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo",
  inverter: "Inversor",
  microinverter: "Microinversor",
  structure_kit: "Estrutura",
  dc_cable: "Cabo DC",
  connector: "Conector",
};

function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name] ?? name;
}

export function StockModal({
  open,
  onClose,
  organizationId,
  editing,
  onSaved,
  onError,
}: StockModalProps): JSX.Element {
  const isEdit = Boolean(editing);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [options, setOptions] = useState<StockProductOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockProductOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(editing ? String(editing.quantity) : "");
      setUnitCost(editing ? editing.unitCost : null);
      setSku(editing?.sku ?? "");
      setNotes(editing?.notes ?? "");
      setSubmitting(false);
      setSearchInput("");
      setDebouncedSearch("");
      setOptions([]);
      setSelectedProduct(null);
    }
  }, [open, editing]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput.trim()), 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!open || isEdit) return;
    let cancelled = false;
    setSearchLoading(true);
    searchStockProducts(organizationId, { search: debouncedSearch })
      .then((res) => {
        if (!cancelled) setOptions(res);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, organizationId, debouncedSearch]);

  const qtyNum = Number(quantity.replace(",", "."));
  const costNum = unitCost ?? NaN;
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!Number.isFinite(qtyNum) || qtyNum < 0) return false;
    if (!Number.isFinite(costNum) || costNum < 0) return false;
    if (!isEdit && !selectedProduct) return false;
    return true;
  }, [submitting, qtyNum, costNum, isEdit, selectedProduct]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isEdit && editing) {
        await updateStockItem(organizationId, editing.id, {
          quantity: Math.round(qtyNum),
          unitCost: costNum,
          sku: sku.trim() || null,
          notes: notes.trim() || null,
        });
      } else if (selectedProduct) {
        await createStockItem(organizationId, {
          productId: selectedProduct.id,
          quantity: Math.round(qtyNum),
          unitCost: costNum,
          sku: sku.trim() || null,
          notes: notes.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose();
      }}
    >
      <DialogContent muiMaxWidth="sm" className="overflow-hidden rounded-2xl p-0">
        <DialogHeader className="space-y-1 border-b border-[var(--color-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Package className="h-5 w-5 text-[var(--color-primary)]" />
            {isEdit ? "Editar item do estoque" : "Adicionar ao estoque"}
          </DialogTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Escolha um produto do catálogo e informe a quantidade e o custo unitário.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {isEdit && editing ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {editing.productName}
              </p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                {editing.brandName} · {categoryLabel(editing.categoryName)}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Produto</Label>
              <Autocomplete
                options={options}
                value={selectedProduct}
                onChange={(_, v) => setSelectedProduct(v)}
                inputValue={searchInput}
                onInputChange={(_, v, reason) => {
                  if (reason !== "reset") setSearchInput(v);
                }}
                getOptionLabel={(o) => `${o.name} · ${o.brandName}`}
                getOptionDisabled={(o) => o.alreadyInStock}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                loading={searchLoading}
                noOptionsText={
                  debouncedSearch ? "Nenhum produto encontrado." : "Comece a digitar o nome..."
                }
                slotProps={{ popper: { style: { zIndex: 2000 } } }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {option.name}
                        {option.alreadyInStock ? " · já no estoque" : ""}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        {option.brandName} · {categoryLabel(option.categoryName)}
                      </span>
                    </div>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Nome do produto..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchLoading ? <CircularProgress size={16} color="inherit" /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stock-qty">Quantidade</Label>
              <Input
                id="stock-qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 30"
                inputMode="numeric"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-cost">Custo unitário (R$)</Label>
              <CurrencyInput
                id="stock-cost"
                value={unitCost}
                onValueChange={setUnitCost}
                disabled={submitting}
              />
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                É o <strong>custo</strong> (não o preço de venda). A margem vem das regras de custo.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stock-sku">SKU interno (opcional)</Label>
              <Input
                id="stock-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código interno"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-notes">Observações (opcional)</Label>
              <Input
                id="stock-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: lote, validade..."
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : isEdit ? (
              "Salvar"
            ) : (
              "Adicionar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
