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

      <Link
        href="/configuracoes/organizacao"
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <Card className="transition hover:border-emerald-500/40">
          <CardHeader>
            <CardTitle>Organização</CardTitle>
            <CardDescription>Nome, CNPJ, logo e WhatsApp da empresa.</CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link
        href="/configuracoes/documentos"
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <Card className="transition hover:border-emerald-500/40">
          <CardHeader>
            <CardTitle>Modelos de Contratos & Documentos</CardTitle>
            <CardDescription>
              Personalize o modelo padrão global de Contrato Solar e Procuração ANEEL aplicados aos
              seus próximos clientes.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
