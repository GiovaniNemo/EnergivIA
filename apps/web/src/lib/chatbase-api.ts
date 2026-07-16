export interface ChatbaseIdentity {
  userId: string;
  userHash: string;
}

export async function getChatbaseIdentity(): Promise<ChatbaseIdentity> {
  const res = await fetch("/api/proxy/chatbase/identity-hash", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Falha ao autenticar com o Chatbase.");
  }
  return res.json();
}
