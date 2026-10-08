/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth0 } from "@/lib/auth0";
import { extractEnergyBillFromPdfBuffer, extractEnergyBillFromImage } from "@/lib/bill-extractor";

export const maxDuration = 60;

function createTextStreamResponse(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunkSize = 25;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: chunk })}\n\n`)
        );
        if (text.length > 50) {
          await new Promise((resolve) => setTimeout(resolve, 8));
        }
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "finish" })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response("Mensagens inválidas", { status: 400 });
    }

    // 1. Autenticação e validação de plano / organização
    let integratorCompanyName = "EnergivIA";
    let currentOrgId = "";
    let userAuthToken = "";

    try {
      const session = await auth0.getSession();
      if (session) {
        let token = "";
        try {
          const authResult = await auth0.getAccessToken({
            audience: process.env["AUTH0_AUDIENCE"],
          });
          token = authResult.token || session.accessToken || session.idToken || "";
        } catch {
          token = session.idToken || session.accessToken || "";
        }
        userAuthToken = token;

        if (token) {
          const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
          const meRes = await fetch(`${baseURL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            const isTrial = meData.isTrial ?? false;
            const isLocked = Boolean(
              (isTrial && meData.trialExpired) ||
              (isTrial && meData.isTrialProposalLimitReached) ||
              (!isTrial && meData.isProposalLimitReached) ||
              meData.isTrialLocked
            );
            if (isLocked) {
              let lockMsg =
                "☀️ Seu período de testes de 5 dias úteis encerrou. Faça upgrade para continuar utilizando o assistente com IA.\n\n👉 Acesse: https://app.energivia.com.br/gestao/meus-planos";
              if (isTrial && meData.isTrialProposalLimitReached) {
                lockMsg =
                  "⚡ Você atingiu o limite de 20 propostas gratuitas do período de teste. Faça upgrade para continuar gerando orçamentos com a IA.\n\n👉 Acesse: https://app.energivia.com.br/gestao/meus-planos";
              } else if (!isTrial && meData.isProposalLimitReached) {
                lockMsg = `⚡ Você atingiu o limite mensal de ${meData.proposalsLimit ?? 50} propostas do seu plano. Faça upgrade para o Plano Pro para continuar gerando orçamentos.\n\n👉 Acesse: https://app.energivia.com.br/gestao/meus-planos`;
              }
              return new Response(lockMsg, {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              });
            }

            if (meData.organizations && meData.organizations.length > 0) {
              const currentOrg =
                meData.organizations.find((o: any) => o.id === meData.currentOrganizationId) ||
                meData.organizations[0];
              if (currentOrg) {
                currentOrgId = currentOrg.id || "";
                if (currentOrg.name) {
                  integratorCompanyName = currentOrg.name;
                }
              }
            } else if (meData.company) {
              integratorCompanyName = meData.company;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar dados do integrador ou validar plano no /api/chat:", e);
    }

    // 2. Processar a última mensagem e extrair fatura se anexada
    const lastMsg = messages[messages.length - 1];
    let currentTurnExtraction: any = null;
    const incomingText = typeof lastMsg?.content === "string" ? lastMsg.content.trim() : "";

    if (lastMsg?.imageUrl) {
      if (lastMsg.imageUrl.startsWith("data:application/pdf")) {
        try {
          const base64Data = lastMsg.imageUrl.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await extractEnergyBillFromPdfBuffer(buffer);
          if (result && result.exactAverageKwh > 0) {
            currentTurnExtraction = {
              exactAverageKwh: result.exactAverageKwh,
              monthCount: result.monthCount,
              totalSumKwh: result.totalSumKwh,
              data: {
                cidade: result.data.cidade,
                uf: result.data.uf,
                tipo_conexao: result.data.tipo_conexao,
              },
              formattedSummary: result.formattedSummary,
            };
          }
        } catch (e) {
          console.error("[PDF EXTRACTION ERROR]", e);
        }
      } else {
        try {
          const result = await extractEnergyBillFromImage(lastMsg.imageUrl);
          if (result && result.exactAverageKwh > 0) {
            currentTurnExtraction = {
              exactAverageKwh: result.exactAverageKwh,
              monthCount: result.monthCount,
              totalSumKwh: result.totalSumKwh,
              data: {
                cidade: result.data.cidade,
                uf: result.data.uf,
                tipo_conexao: result.data.tipo_conexao,
              },
              formattedSummary: result.formattedSummary,
            };
          }
        } catch (e) {
          console.error("[IMAGE EXTRACTION ERROR]", e);
        }
      }
    }

    // 3. Formatar histórico das mensagens preservando o contexto
    const previousMessages = messages.slice(0, messages.length - 1).map((m: any) => {
      const content = typeof m.content === "string" ? m.content : "";
      return {
        role: m.role,
        content,
        metadata: m.metadata || {},
      };
    });

    // 4. Delegar para o motor unificado do Bot (mesma lógica e mensagens do WhatsApp)
    const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
    const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (userAuthToken) reqHeaders["Authorization"] = `Bearer ${userAuthToken}`;
    if (currentOrgId) reqHeaders["x-organization-id"] = currentOrgId;

    const botRes = await fetch(`${baseURL}/whatsapp/web-chat`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({
        messages: previousMessages,
        incomingText,
        organizationId: currentOrgId,
        contactName: integratorCompanyName || "Integrador",
        extractionResult: currentTurnExtraction,
      }),
    });

    if (botRes.ok) {
      const data = await botRes.json();
      const replyText = data.replyText || "";
      return createTextStreamResponse(replyText);
    }

    throw new Error(`Falha no motor de atendimento solar: ${botRes.status}`);
  } catch (error: any) {
    console.error("Erro na API de Chat:", error);
    return new Response(
      `Desculpe, ocorreu um erro interno: ${error?.message}. Por favor, tente novamente.`,
      {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      }
    );
  }
}
