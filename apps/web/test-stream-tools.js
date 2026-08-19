const { streamText, tool } = require("ai");
const { openai } = require("@ai-sdk/openai");
const { z } = require("zod");

async function test() {
  const result = await streamText({
    model: openai("gpt-4o"),
    prompt: "Qual o clima em SP?",
    tools: {
      getWeather: tool({
        description: "Get weather",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => "25 graus e ensolarado",
      }),
    },
    maxSteps: 5,
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
}
test().catch(console.error);
