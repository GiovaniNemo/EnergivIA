const { streamText } = require('ai');
const { openai } = require('@ai-sdk/openai');

async function test() {
  const result = await streamText({
    model: openai('gpt-4o'),
    prompt: 'say hello'
  });
  
  const response = result.toUIMessageStreamResponse();
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  const { value } = await reader.read();
  console.log("Chunk:", decoder.decode(value));
}
test().catch(console.error);
