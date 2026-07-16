"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp } from "lucide-react";

export default function UploadBillPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fatura de Energia</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Envie a fatura (PDF) para extração automática. Começando por Copel.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Upload de fatura</CardTitle>
          <CardDescription>
            Selecione o lead e envie o PDF da fatura. O worker processará e preencherá consumo,
            demanda e valor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input id="lead" label="Lead" placeholder="Selecione o lead" disabled />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Arquivo PDF</p>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 p-8">
              <FileUp className="h-10 w-10 text-[var(--color-muted-foreground)]" />
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Arraste o PDF ou clique para selecionar
              </p>
              <Button variant="outline" className="mt-4" disabled>
                Em breve: upload e envio ao worker
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
