import { replaceVariables } from "@/components/proposals/editor/utils";
import type { DecisionCTAActions } from "./types";

export function resolveProposalBaseUrl(fields: Record<string, unknown>, vars: object): string {
  const flat = Object.fromEntries(
    Object.entries(vars as Record<string, unknown>).map(([k, v]) => [
      k,
      v === undefined || v === null ? "" : String(v),
    ])
  );
  const raw = String(fields["proposalUrl"] ?? "").trim();
  const legacy = String(fields["buttonAction"] ?? "").trim();
  const pick = raw || legacy;
  if (!pick) return "";
  return replaceVariables(pick, flat);
}

export function resolveCtaActions(fields: Record<string, unknown>): DecisionCTAActions {
  return {
    accept: fields["acceptEnabled"] !== false,
    edit: fields["editEnabled"] !== false,
    reject: fields["rejectEnabled"] !== false,
  };
}
