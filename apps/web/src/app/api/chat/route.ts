import { OpenAI } from "openai";
import pdfParse from "pdf-parse";

export const maxDuration = 60; // Configuração Vercel

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const openai = new OpenAI({
            apiKey: process.env["OPENAI_API_KEY"],
        });

        const systemPrompt = `Você é a assistente inteligente oficial da plataforma EnergivIA. Seu objetivo é EXCLUSIVAMENTE ajudar os integradores solares a gerenciar orçamentos, ler faturas, dimensionar kits solares, e operar o sistema de CRM da EnergivIA.
REGRA CRÍTICA: Você ESTÁ PROIBIDA de responder sobre qualquer assunto fora de Energia Solar, Dimensionamento, CRM, Faturas de Energia ou a plataforma EnergivIA. Se o usuário perguntar sobre outros temas, responda SOMENTE: "Desculpe, sou a assistente da EnergivIA e só posso ajudar com assuntos relacionados à energia solar e nossa plataforma."
Sempre seja objetiva nas suas respostas.
Se o usuário pedir para dimensionar e não passar informações suficientes (como padrão de conexão ou tipo de telhado), você DEVE perguntar de forma amigável antes de prosseguir.`;

        const formattedMessages = await Promise.all(
            messages.map(async (m: any) => {
                if (m.imageUrl) {
                    if (m.imageUrl.startsWith("data:application/pdf")) {
                        // Extrair PDF
                        const base64Data = m.imageUrl.split(',')[1];
                        const buffer = Buffer.from(base64Data, "base64");
                        let pdfText = "O usuário enviou uma fatura/documento em PDF. Conteúdo extraído:\n\n";
                        try {
                            const data = await pdfParse(buffer);
                            pdfText += data.text;
                        } catch (e) {
                            console.error("Erro no PDF:", e);
                            pdfText += "(Falha ao extrair texto do documento PDF. Avise o usuário que o PDF pode estar ilegível ou em formato de imagem.)";
                        }
                        return { role: m.role, content: `${m.content || "Segue o PDF:"}\n\n${pdfText}` };
                    }

                    return {
                        role: m.role,
                        content: [
                            { type: "text", text: m.content || "Segue a imagem:" },
                            { type: "image_url", image_url: { url: m.imageUrl } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        );

        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, ...formattedMessages],
            stream: true,
        });

        const encoder = new TextEncoder();

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.choices[0]?.delta?.content || "";
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: any) {
        console.error('Erro na API de Chat:', error);
        return new Response(JSON.stringify({ error: error?.message || 'Falha na comunicação com a IA' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
