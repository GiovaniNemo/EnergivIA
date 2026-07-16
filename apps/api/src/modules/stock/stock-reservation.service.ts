import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma, StockMovementType } from "@prisma/client";
import {
  isProposalIntegratorSnapshot,
  type ProposalIntegratorSnapshot,
} from "@energivia/shared-types";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Prisma.TransactionClient;

const PROPOSAL_REF = "proposal";

function parseIntegrator(renderedData: unknown): ProposalIntegratorSnapshot | null {
  if (!renderedData || typeof renderedData !== "object") return null;
  const int = (renderedData as { integrator?: unknown }).integrator;
  return isProposalIntegratorSnapshot(int) ? int : null;
}

function isOwnStock(snapshot: ProposalIntegratorSnapshot | null): boolean {
  return snapshot?.sourceType === "own_stock";
}

function neededByProduct(snapshot: ProposalIntegratorSnapshot): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of snapshot.kitItems) {
    if (!line.productId || line.quantity <= 0) continue;
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
  }
  return map;
}

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async currentReservationByItem(
    tx: Tx,
    organizationId: string,
    proposalId: string
  ): Promise<Map<string, number>> {
    const movs = await tx.stockMovement.findMany({
      where: { organizationId, referenceType: PROPOSAL_REF, referenceId: proposalId },
      select: { stockItemId: true, type: true, quantity: true },
    });
    const map = new Map<string, number>();
    for (const m of movs) {
      const sign =
        m.type === StockMovementType.RESERVE
          ? 1
          : m.type === StockMovementType.RELEASE || m.type === StockMovementType.OUTBOUND
            ? -1
            : 0;
      map.set(m.stockItemId, (map.get(m.stockItemId) ?? 0) + sign * m.quantity);
    }
    for (const [k, v] of map) if (v <= 0) map.delete(k);
    return map;
  }

  private async releaseInTx(tx: Tx, organizationId: string, proposalId: string): Promise<void> {
    const reserved = await this.currentReservationByItem(tx, organizationId, proposalId);
    for (const [stockItemId, qty] of reserved) {
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { reservedQuantity: { decrement: qty } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId,
          stockItemId,
          type: StockMovementType.RELEASE,
          quantity: qty,
          referenceType: PROPOSAL_REF,
          referenceId: proposalId,
          reason: "Liberação de reserva da proposta",
        },
      });
    }
  }

  async reserveInTx(
    tx: Tx,
    organizationId: string,
    proposalId: string,
    snapshot: ProposalIntegratorSnapshot,
    createdById?: string
  ): Promise<void> {
    if (!isOwnStock(snapshot)) return;
    await this.releaseInTx(tx, organizationId, proposalId);

    const needed = neededByProduct(snapshot);
    if (needed.size === 0) return;

    const items = await tx.stockItem.findMany({
      where: { organizationId, productId: { in: [...needed.keys()] } },
      include: { product: true },
    });
    const byProduct = new Map(items.map((i) => [i.productId, i]));

    for (const [productId, need] of needed) {
      const item = byProduct.get(productId);
      if (!item) {
        throw new BadRequestException(
          "Um item do kit não está mais no seu estoque. Ajuste o estoque ou o kit."
        );
      }
      const available = item.quantity - item.reservedQuantity;
      if (available < need) {
        throw new BadRequestException(
          `Estoque insuficiente para ${item.product.name}: disponível ${available}, necessário ${need}.`
        );
      }
    }

    for (const [productId, need] of needed) {
      const item = byProduct.get(productId)!;
      await tx.stockItem.update({
        where: { id: item.id },
        data: { reservedQuantity: { increment: need } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId,
          stockItemId: item.id,
          type: StockMovementType.RESERVE,
          quantity: need,
          referenceType: PROPOSAL_REF,
          referenceId: proposalId,
          reason: "Reserva por proposta (estoque próprio)",
          createdById: createdById ?? null,
        },
      });
    }
  }

  async releaseForProposal(organizationId: string, proposalId: string): Promise<void> {
    await this.prisma.$transaction((tx) => this.releaseInTx(tx, organizationId, proposalId));
  }

  private async commitInTx(tx: Tx, organizationId: string, proposalId: string): Promise<void> {
    const reserved = await this.currentReservationByItem(tx, organizationId, proposalId);
    for (const [stockItemId, qty] of reserved) {
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { quantity: { decrement: qty }, reservedQuantity: { decrement: qty } },
      });
      await tx.stockMovement.create({
        data: {
          organizationId,
          stockItemId,
          type: StockMovementType.OUTBOUND,
          quantity: qty,
          referenceType: PROPOSAL_REF,
          referenceId: proposalId,
          reason: "Baixa de estoque (venda fechada)",
        },
      });
    }
  }

  private async ownStockProposalIdsForDeal(dealId: string, tenantId: string): Promise<string[]> {
    const proposals = await this.prisma.proposal.findMany({
      where: { dealId, tenantId, deletedAt: null },
      select: { id: true, renderedData: true },
    });
    return proposals.filter((p) => isOwnStock(parseIntegrator(p.renderedData))).map((p) => p.id);
  }

  async commitForDeal(tenantId: string, dealId: string): Promise<void> {
    const ids = await this.ownStockProposalIdsForDeal(dealId, tenantId);
    for (const proposalId of ids) {
      await this.prisma
        .$transaction((tx) => this.commitInTx(tx, tenantId, proposalId))
        .catch((e) => this.logger.error(`commitForDeal ${proposalId}: ${String(e)}`));
    }
  }

  async releaseForDeal(tenantId: string, dealId: string): Promise<void> {
    const ids = await this.ownStockProposalIdsForDeal(dealId, tenantId);
    for (const proposalId of ids) {
      await this.prisma
        .$transaction((tx) => this.releaseInTx(tx, tenantId, proposalId))
        .catch((e) => this.logger.error(`releaseForDeal ${proposalId}: ${String(e)}`));
    }
  }

  async reserveFromRenderedInTx(
    tx: Tx,
    organizationId: string,
    proposalId: string,
    renderedData: unknown,
    createdById?: string
  ): Promise<void> {
    const snapshot = parseIntegrator(renderedData);
    if (!snapshot || !isOwnStock(snapshot)) return;
    await this.reserveInTx(tx, organizationId, proposalId, snapshot, createdById);
  }
}
