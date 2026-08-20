import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SystemFeatureFlags {
  aiFeatures: boolean;
  newProposalEditor: boolean;
  betaFinancing: boolean;
  publicAPI: boolean;
  audioTranscription: boolean;
  maintenanceMode: boolean;
  advancedFinancialSimulation: boolean;
  instantEnergyBillOCR: boolean;
}

let globalFeatureFlags: SystemFeatureFlags = {
  aiFeatures: true,
  newProposalEditor: true,
  betaFinancing: true,
  publicAPI: false,
  audioTranscription: true,
  maintenanceMode: false,
  advancedFinancialSimulation: true,
  instantEnergyBillOCR: true,
};

export async function GET() {
  return NextResponse.json({
    flags: globalFeatureFlags,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    globalFeatureFlags = {
      ...globalFeatureFlags,
      ...body,
    };

    return NextResponse.json({
      success: true,
      message: "Feature flags atualizadas com sucesso!",
      flags: globalFeatureFlags,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { success: false, error: "Falha ao atualizar feature flags", details: errorMessage },
      { status: 400 }
    );
  }
}
