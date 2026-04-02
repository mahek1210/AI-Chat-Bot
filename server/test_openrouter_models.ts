import { config } from 'dotenv';
import path from 'path';

// Load .env
config({ path: path.resolve(__dirname, '.env') });

import { OpenRouterService } from './src/services/openrouterService';

async function testModels() {
  const service = new OpenRouterService();

  const models = [
    "openrouter:claude-3.5-sonnet",
    "openrouter:llama-3.1-70b",
    "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter:qwen/qwen3-next-80b-a3b-instruct:free",
    "openrouter:google/gemma-3n-e2b-it:free",
    "openrouter:nousresearch/hermes-3-llama-3.1-405b:free",
    "openrouter:arcee-ai/maestro-reasoning",
    "openrouter:mistralai/mistral-small-3.1-24b-instruct:free",
    "openrouter:arcee-ai/trinity-large-preview:free",
    "openrouter/auto",
    "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
  ];

  const results: any[] = [];

  for (const model of models) {
    console.log(`\n\nTesting model: ${model}`);
    
    // 1. Without Tool
    let noToolStatus = "Wait";
    let noToolError = "";
    try {
      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 15000);
      
      const res = await service.generate({
        messages: [{ role: 'user', content: 'Reply with the single word: "Hello"' }],
        model,
        temperature: 0.1,
        abortSignal: abortController.signal
      });
      noToolStatus = "SUCCESS ✅";
    } catch (e: any) {
      noToolStatus = "FAILED ❌";
      noToolError = e.message || e.toString();
    }

    // 2. With Tool
    let withToolStatus = "Wait";
    let withToolError = "";
    
    try {
      let loggedWarning = false;
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (args[0]?.includes('Retrying without tools')) {
          loggedWarning = true;
        }
        originalWarn(...args);
      };

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 15000);

      const res = await service.generate({
        messages: [{ role: 'user', content: 'What is the weather? Please search the web to answer.' }],
        model,
        temperature: 0.1,
        abortSignal: abortController.signal,
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web",
              parameters: {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"],
              },
            },
          },
        ]
      });

      console.warn = originalWarn;

      if (loggedWarning) {
        withToolStatus = "UNSUPPORTED (Retried without tool) ⚠️";
      } else if (res.toolCalls && res.toolCalls.length > 0) {
        withToolStatus = "SUCCESS (Used Tool) ✅";
      } else {
        withToolStatus = "SUCCESS (Ignored Tool) 🤔";
      }
    } catch (e: any) {
      withToolStatus = "FAILED ❌";
      withToolError = e.message || e.toString();
    }

    results.push({
      Model: model.replace('openrouter:', ''),
      WithoutTool: noToolStatus,
      WithoutToolError: noToolError,
      WithTool: withToolStatus,
      WithToolError: withToolError
    });
  }

  const fs = require('fs');
  const reportPath = path.resolve(__dirname, 'results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log("=== FINAL REPORT SAVED TO results.json ===");
}

testModels().catch(console.error);
