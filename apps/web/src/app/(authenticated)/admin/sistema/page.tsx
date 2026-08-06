"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  Database,
  Mail,
  Globe,
  Settings2,
  Trash2,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  LucideIcon,
} from "lucide-react";

export default function AdminSistemaPage() {
  const [loading, setLoading] = useState(true);

  // Mock Feature Flags state
  const [flags, setFlags] = useState({
    aiFeatures: true,
    newProposalEditor: true,
    betaFinancing: false,
    publicAPI: false,
  });

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <LoadingState
        label="Verificando sistemas..."
        description="Carregando configurações de infraestrutura e feature flags"
      />
    );
  }

  const ServiceStatus = ({
    name,
    status,
    icon: Icon,
  }: {
    name: string;
    status: "operational" | "degraded" | "offline";
    icon: LucideIcon;
  }) => (
    <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-card)]">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            status === "operational"
              ? "bg-green-500/10 text-green-500"
              : status === "degraded"
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-[var(--color-foreground)]">{name}</h4>
          <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{status}</p>
        </div>
      </div>
      <div>
        {status === "operational" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          Sistema e Infraestrutura
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-2">
          Gerenciamento global de serviços, caches e feature flags (ADMIN)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Saúde da Plataforma */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[var(--color-primary)]" />
                Saúde dos Serviços
              </CardTitle>
              <CardDescription>
                Status atual das integrações da plataforma EnergivIA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ServiceStatus
                  name="Banco de Dados (Prisma)"
                  status="operational"
                  icon={Database}
                />
                <ServiceStatus
                  name="Serviço de PDF (Puppeteer)"
                  status="operational"
                  icon={Server}
                />
                <ServiceStatus
                  name="Provedor de E-mail (Resend)"
                  status="operational"
                  icon={Mail}
                />
                <ServiceStatus name="API do WhatsApp (Z-API)" status="degraded" icon={Globe} />
              </div>
            </CardContent>
          </Card>

          {/* Gerenciamento de Cache */}
          <Card className="border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-5 w-5" />
                Ações Perigosas
              </CardTitle>
              <CardDescription>Ações que afetam todos os usuários da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[var(--color-muted)]/20 border border-[var(--color-border)] rounded-lg">
                <div>
                  <h4 className="font-medium text-[var(--color-foreground)]">
                    Limpar Cache Global
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Força a invalidação do cache do Next.js e relê os dados do BD.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 sm:mt-0 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Flags */}
        <div className="col-span-1 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-[var(--color-primary)]" />
                Feature Flags
              </CardTitle>
              <CardDescription>Ative ou desative recursos para todos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-sm">
                      IA Generativa
                    </h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Gerador de seções na proposta
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFlag("aiFeatures")}
                    className="text-[var(--color-primary)] transition-transform hover:scale-105 focus:outline-none"
                  >
                    {flags.aiFeatures ? (
                      <ToggleRight className="h-8 w-8 text-[var(--color-primary)]" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-sm">
                      Novo Editor V2
                    </h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Ativa a interface experimental do editor
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFlag("newProposalEditor")}
                    className="text-[var(--color-primary)] transition-transform hover:scale-105 focus:outline-none"
                  >
                    {flags.newProposalEditor ? (
                      <ToggleRight className="h-8 w-8 text-[var(--color-primary)]" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-sm">
                      Módulo de Financiamento
                    </h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Liberar acesso antecipado (Beta)
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFlag("betaFinancing")}
                    className="text-[var(--color-primary)] transition-transform hover:scale-105 focus:outline-none"
                  >
                    {flags.betaFinancing ? (
                      <ToggleRight className="h-8 w-8 text-[var(--color-primary)]" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-sm">
                      API Pública
                    </h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Habilita integrações externas via Token
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFlag("publicAPI")}
                    className="text-[var(--color-primary)] transition-transform hover:scale-105 focus:outline-none"
                  >
                    {flags.publicAPI ? (
                      <ToggleRight className="h-8 w-8 text-[var(--color-primary)]" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
