import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function run() {
    const result = await streamText({
        model: openai('gpt-4o'),
        messages: [{ role: 'user', content: 'oi' }]
    });
    const res = result.toTextStreamResponse({ headers: { 'Cache-Control': 'no-cache' } });
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body length:", body.length);
}
run().catch(console.error);
