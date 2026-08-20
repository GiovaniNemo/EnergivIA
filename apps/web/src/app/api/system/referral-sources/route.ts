import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ReferralSourceOption {
  id: string;
  label: string;
  requiresDetails: boolean;
  detailsPlaceholder?: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent default referral source options across server lifecycle
let globalReferralSources: ReferralSourceOption[] = [
  {
    id: "indicacao-amigo",
    label: "Indicação de Amigo ou Integrador",
    requiresDetails: true,
    detailsPlaceholder: "Nome de quem recomendou a EnergivIA",
    active: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "instagram",
    label: "Instagram",
    requiresDetails: false,
    active: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "google-busca",
    label: "Google / Pesquisa na Web",
    requiresDetails: false,
    active: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "youtube",
    label: "YouTube / Vídeo",
    requiresDetails: false,
    active: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    requiresDetails: false,
    active: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "distribuidor-solar",
    label: "Distribuidor Solar (Edeltec, Fortlev, etc.)",
    requiresDetails: true,
    detailsPlaceholder: "Qual distribuidor / representante?",
    active: true,
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evento-feira",
    label: "Evento / Feira Solar (Intersolar, etc.)",
    requiresDetails: true,
    detailsPlaceholder: "Qual evento ou feira?",
    active: true,
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "parceiro-comercial",
    label: "Parceiro Comercial",
    requiresDetails: true,
    detailsPlaceholder: "Nome do parceiro",
    active: true,
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "outros",
    label: "Outros",
    requiresDetails: true,
    detailsPlaceholder: "Como conheceu?",
    active: true,
    order: 99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("all") === "true";

  const sources = includeInactive
    ? globalReferralSources
    : globalReferralSources.filter((s) => s.active);

  const sorted = [...sources].sort((a, b) => a.order - b.order);

  return NextResponse.json({
    sources: sorted,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const label = (body.label || "").trim();

    if (!label) {
      return NextResponse.json({ error: "O nome da opção é obrigatório." }, { status: 400 });
    }

    const id =
      body.id?.trim() ||
      label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") ||
      `source-${Date.now()}`;

    const newOption: ReferralSourceOption = {
      id,
      label,
      requiresDetails: Boolean(body.requiresDetails),
      detailsPlaceholder: body.detailsPlaceholder?.trim() || undefined,
      active: body.active !== undefined ? Boolean(body.active) : true,
      order: typeof body.order === "number" ? body.order : globalReferralSources.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Check if ID exists, update if so, else append
    const existingIdx = globalReferralSources.findIndex((s) => s.id === id);
    if (existingIdx >= 0) {
      globalReferralSources[existingIdx] = {
        ...globalReferralSources[existingIdx]!,
        ...newOption,
        createdAt: globalReferralSources[existingIdx]!.createdAt,
        updatedAt: new Date().toISOString(),
      };
    } else {
      globalReferralSources.push(newOption);
    }

    return NextResponse.json({
      success: true,
      source: newOption,
      sources: globalReferralSources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar opção" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body.sources)) {
      // Bulk update (e.g. reordering or full list update)
      globalReferralSources = body.sources;
      return NextResponse.json({ success: true, sources: globalReferralSources });
    }

    const { id, active, label, requiresDetails, detailsPlaceholder, order } = body;
    if (!id) {
      return NextResponse.json({ error: "ID da opção é obrigatório." }, { status: 400 });
    }

    const index = globalReferralSources.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Opção não encontrada." }, { status: 404 });
    }

    const current = globalReferralSources[index]!;
    globalReferralSources[index] = {
      ...current,
      ...(label !== undefined ? { label: String(label).trim() } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(requiresDetails !== undefined ? { requiresDetails: Boolean(requiresDetails) } : {}),
      ...(detailsPlaceholder !== undefined
        ? { detailsPlaceholder: String(detailsPlaceholder).trim() }
        : {}),
      ...(order !== undefined ? { order: Number(order) } : {}),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      source: globalReferralSources[index],
      sources: globalReferralSources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar opção" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório para exclusão." }, { status: 400 });
    }

    globalReferralSources = globalReferralSources.filter((s) => s.id !== id);

    return NextResponse.json({
      success: true,
      sources: globalReferralSources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir opção" },
      { status: 500 }
    );
  }
}
