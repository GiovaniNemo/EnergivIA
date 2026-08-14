require('dotenv').config({ path: '../../.env' }); // or wherever .env is
const { streamText, tool } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { z } = require('zod');
const { systemPrompt } = require('./src/app/api/chat/prompt');
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY }); // User's env must have this! But if I run it, I don't have it.
