import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

async function main() {
    try {
        const result = await streamText({
            model: openai('gpt-4o'),
            system: 'Você é um assistente.',
            messages: [{ role: 'user', content: 'oi' }],
            maxSteps: 5
        });
        console.log('SUCCESS');
        const text = await result.text;
        console.log('TEXT:', text);
    } catch(e) {
        console.error('ERROR:', e.name, e.message, e.cause, e.prompt);
    }
}
main();
