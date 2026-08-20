import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SystemAnnouncement {
  id: string;
  active: boolean;
  type: "info" | "warning" | "maintenance" | "critical" | "success";
  title: string;
  message: string;
  category?: string;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  showInSidebar: boolean;
  showInBanner: boolean;
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent state across server lifecycle
let globalAnnouncement: SystemAnnouncement = {
  id: "default-announcement-1",
  active: false,
  type: "maintenance",
  title: "Aviso de Atualização do Sistema",
  message:
    "Estamos aprimorando os servidores de cálculo solar. Todas as funções continuam operando normalmente.",
  category: "Manutenção Programada",
  actionText: "Saiba mais",
  actionUrl: "",
  dismissible: true,
  showInSidebar: true,
  showInBanner: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json({
    announcement: globalAnnouncement,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const updated: SystemAnnouncement = {
      id: body.id || `announcement-${Date.now()}`,
      active: typeof body.active === "boolean" ? body.active : true,
      type: body.type || "info",
      title: body.title || "Aviso da Plataforma",
      message: body.message || "",
      category: body.category || "Geral",
      actionText: body.actionText || "",
      actionUrl: body.actionUrl || "",
      dismissible: typeof body.dismissible === "boolean" ? body.dismissible : true,
      showInSidebar: typeof body.showInSidebar === "boolean" ? body.showInSidebar : true,
      showInBanner: typeof body.showInBanner === "boolean" ? body.showInBanner : true,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    globalAnnouncement = updated;

    return NextResponse.json({
      success: true,
      message: "Aviso do sistema salvo com sucesso!",
      announcement: globalAnnouncement,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { success: false, error: "Falha ao processar dados", details: errorMessage },
      { status: 400 }
    );
  }
}
