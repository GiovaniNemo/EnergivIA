import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
async function run() {
    const result = await streamText({
        model: openai('gpt-4o'),
        messages: [{ role: 'user', content: 'oi' }]
    });
    console.log(Object.keys(result));
    console.log(typeof result.toTextStreamResponse);
    console.log(typeof result.toDataStreamResponse);
}
run().catch(console.error);
