import { OpenAI } from "openai";

export const maxDuration = 60; // Configuração Vercel

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const openai = new OpenAI({
            apiKey: process.env["OPENAI_API_KEY"],
        });

        const systemPrompt = `Você é a assistente inteligente oficial da plataforma EnergivIA. Seu objetivo é ajudar os integradores solares a gerenciar orçamentos, ler faturas, dimensionar kits solares, e operar o sistema de CRM da EnergivIA.
Você é proativa, eficiente, e se comunica com um tom profissional e amigável.
Sempre seja objetiva nas suas respostas.
Se o usuário pedir para dimensionar e não passar informações suficientes (como padrão de conexão ou tipo de telhado), você DEVE perguntar antes de prosseguir.`;

        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
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
    } catch (error) {
        console.error('Erro na API de Chat:', error);
        return new Response(JSON.stringify({ error: 'Falha na comunicação com a IA' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
