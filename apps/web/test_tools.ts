import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

async function run() {
    const result = await streamText({
        model: openai('gpt-4o'),
        messages: [{ role: 'user', content: 'oi' }],
        maxSteps: 5,
        tools: {
            buscar_hsp_localidade: {
                description: 'Busca o índice de irradiação solar',
                parameters: z.object({ cidade: z.string(), estado: z.string() }),
                execute: async () => ({ hsp: 5.0, info: 'Fake' })
            },
            gerar_cotacao_distribuidor: {
                description: 'Gera cotação',
                parameters: z.object({ monthlyConsumption: z.number(), location: z.string(), roofType: z.string(), includeStructure: z.boolean() }),
                execute: async () => ({ success: true })
            }
        },
        system: `Você é o motor de inteligência artificial da plataforma EnergivIA...` // Dummy fake to repro
    });
    const stream = result.fullStream;
    for await (const part of stream) {
        console.log(part);
    }
}
run().catch(console.error);
