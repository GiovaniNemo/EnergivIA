"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { deleteCostRule, listCostRules, type CostRuleRow } from "@/lib/cost-rules-api";
import { CostRuleModal } from "./CostRuleModal";
import { CostRulesGroupedList } from "./CostRulesGroupedList";

export function ProjectCostRulesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostRuleRow | null>(null);
  const [snack, setSnack] = useState<{ severity: "success" | "error"; message: string } | null>(
    null
  );

  const canEdit = currentOrganization?.role === "OWNER" || currentOrganization?.role === "ADMIN";

  const query = useQuery({
    queryKey: ["cost-rules", currentOrganizationId],
    queryFn: () => listCostRules(currentOrganizationId!),
    enabled: Boolean(currentOrganizationId),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["cost-rules", currentOrganizationId] });
  }, [queryClient, currentOrganizationId]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCostRule(currentOrganizationId!, id),
    onSuccess: () => {
      invalidate();
      setSnack({ severity: "success", message: "Regra removida." });
    },
    onError: (e: Error) => {
      setSnack({ severity: "error", message: e.message || "Não foi possível remover." });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (rule: CostRuleRow) => {
    setEditing(rule);
    setModalOpen(true);
  };

  const handleDelete = (rule: CostRuleRow) => {
    if (!canEdit) return;
    if (
      !window.confirm(
        `Remover esta regra de “${rule.name}”? Esta ação não pode ser desfeita pelo utilizador.`
      )
    ) {
      return;
    }
    removeMutation.mutate(rule.id);
  };

  if (!currentOrganizationId || !currentOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Selecione uma organização.</p>
      </div>
    );
  }

  if (query.isLoading) {
    return <LoadingState label="Carregando regras de custo" />;
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-destructive)]">
          {query.error instanceof Error ? query.error.message : "Falha ao carregar."}
        </p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const rules = query.data ?? [];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custos do projeto</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Cadastre regras flexíveis (valor fixo, percentual ou por kWp), com ou sem faixa de
          potência. No futuro, o sistema usará isto ao montar custos da proposta.
        </p>
      </div>

      {!canEdit ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          Apenas proprietário ou administrador pode criar ou editar regras. Você pode consultar a
          lista abaixo.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={openCreate} disabled={!canEdit}>
          Adicionar regra de custo
        </Button>
      </div>

      <CostRulesGroupedList
        rules={rules}
        canEdit={canEdit}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <CostRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={currentOrganizationId}
        editing={editing}
        existingRules={rules}
        onSaved={() => {
          invalidate();
          setSnack({ severity: "success", message: "Regra guardada com sucesso." });
        }}
        onError={(message) => setSnack({ severity: "error", message })}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert
            onClose={() => setSnack(null)}
            severity={snack.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snack.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </div>
  );
}
