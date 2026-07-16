export type ProposalDecisionAction = "accept" | "edit" | "reject";

export function appendActionToProposalUrl(base: string, action: ProposalDecisionAction): string {
  const trimmed = base.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.searchParams.set("action", action);
    return u.toString();
  } catch {
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}action=${encodeURIComponent(action)}`;
  }
}
