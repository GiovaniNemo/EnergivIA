import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Preferências da conta e da organização
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Alterne entre claro e escuro na barra superior.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/configuracoes/organizacao"
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <Card className="h-full transition hover:border-emerald-500/40">
            <CardHeader>
              <CardTitle>Organização</CardTitle>
              <CardDescription>Nome, CNPJ, logo e WhatsApp da empresa.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link
          href="/configuracoes/custos-projeto"
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <Card className="h-full transition hover:border-emerald-500/40">
            <CardHeader>
              <CardTitle>Custos do projeto</CardTitle>
              <CardDescription>Regras de custo por nome, tipo e faixa de kWp.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
