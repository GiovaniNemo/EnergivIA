import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Permitir execução no Edge Runtime ou Node, dependendo da necessidade do Auth0
export const maxDuration = 60; // Configuração Vercel

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const systemPrompt = `Você é a assistente inteligente oficial da plataforma EnergivIA. Seu objetivo é ajudar os integradores solares a gerenciar orçamentos, ler faturas, dimensionar kits solares, e operar o sistema de CRM da EnergivIA.
Você é proativa, eficiente, e se comunica com um tom profissional e amigável.
Sempre seja objetiva nas suas respostas.
Se o usuário pedir para dimensionar e não passar informações suficientes (como padrão de conexão ou tipo de telhado), você DEVE perguntar antes de prosseguir.`;

        const result = await streamText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Erro na API de Chat:', error);
        return new Response(JSON.stringify({ error: 'Falha na comunicação com a IA' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
