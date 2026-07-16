import type { FinancingApplicationStatus } from "@prisma/client";

export const APPLICATION_TRANSITIONS: Record<
  FinancingApplicationStatus,
  FinancingApplicationStatus[]
> = {
  CREATED: ["AWAITING_DOCUMENTS", "DOCUMENTS_RECEIVED", "REJECTED"],
  AWAITING_DOCUMENTS: ["DOCUMENTS_RECEIVED", "REJECTED"],
  DOCUMENTS_RECEIVED: ["SUBMITTED_TO_BANK", "AWAITING_DOCUMENTS", "REJECTED"],
  SUBMITTED_TO_BANK: ["UNDER_REVIEW", "PENDING", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["PENDING", "APPROVED", "REJECTED"],
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED", "AWAITING_DOCUMENTS"],
  APPROVED: ["CONTRACT_SIGNED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  CONTRACT_SIGNED: ["CREDIT_RELEASED"],
  CREDIT_RELEASED: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransition(
  from: FinancingApplicationStatus,
  to: FinancingApplicationStatus
): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export const TERMINAL_STATUSES: FinancingApplicationStatus[] = ["COMPLETED"];

export const STATUS_TIMESTAMP_MAP: Partial<
  Record<FinancingApplicationStatus, "submittedAt" | "approvedAt" | "releasedAt">
> = {
  SUBMITTED_TO_BANK: "submittedAt",
  APPROVED: "approvedAt",
  CREDIT_RELEASED: "releasedAt",
};
