"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Users, Building2, FileText, Banknote, TrendingUp, BarChart3 } from "lucide-react";

export default function AdminMetricasPage() {
  const [loading, setLoading] = useState(true);

  // Mock data for the platform metrics
  const stats = {
    totalTenants: 142,
    activeUsers: 856,
    totalProposals: 12450,
    totalRevenue: "R$ 4.2M",
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
        label="Carregando métricas..."
        description="Buscando estatísticas globais da plataforma"
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--color-background)] animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          Plataforma: Métricas Globais
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-2">
          Visão geral do uso da plataforma EnergivIA por todos os locatários (tenants)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizações (Tenants)</CardTitle>
            <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {stats.totalTenants}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">+12 no último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {stats.activeUsers}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">+84 no último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Geradas</CardTitle>
            <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {stats.totalProposals.toLocaleString()}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">+1,200 este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Estimado</CardTitle>
            <Banknote className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {stats.totalRevenue}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              +15% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos mockados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
              Crescimento de Usuários
            </CardTitle>
            <CardDescription>Novos usuários cadastrados nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between p-4 border border-[var(--color-border)] rounded-md bg-[var(--color-muted)]/10 mt-4">
              {/* Mocking bars for the chart */}
              {[30, 45, 60, 50, 75, 90].map((height, i) => (
                <div key={i} className="flex flex-col items-center w-1/6 group cursor-pointer">
                  <div className="text-xs text-[var(--color-muted-foreground)] mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {height * 10}
                  </div>
                  <div
                    className="w-12 bg-[var(--color-primary)]/80 hover:bg-[var(--color-primary)] rounded-t-sm transition-colors"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs font-medium text-[var(--color-muted-foreground)] mt-2">
                    Mês {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
              Propostas Geradas por Mês
            </CardTitle>
            <CardDescription>Volume de PDFs e Links gerados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between p-4 border border-[var(--color-border)] rounded-md bg-[var(--color-muted)]/10 mt-4">
              {/* Mocking lines for the chart */}
              {[40, 35, 70, 85, 80, 100].map((height, i) => (
                <div key={i} className="flex flex-col items-center w-1/6 group cursor-pointer">
                  <div className="text-xs text-[var(--color-muted-foreground)] mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {height * 50}
                  </div>
                  <div
                    className="w-12 bg-blue-500/80 hover:bg-blue-500 rounded-t-sm transition-colors"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs font-medium text-[var(--color-muted-foreground)] mt-2">
                    Mês {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
