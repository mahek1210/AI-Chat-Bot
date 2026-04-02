import { config } from 'dotenv';
import path from 'path';
import * as fs from 'fs';

config({ path: path.resolve(__dirname, '.env') });

const KEY = process.env.OPENROUTER_API_KEY;

const models = [
  "generate_report",
  "claude-3.5-sonnet",
  "llama-3.1-70b",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-3n-e2b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "arcee-ai/maestro-reasoning",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "arcee-ai/trinity-large-preview:free",
  "auto",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
].filter(m => m !== 'generate_report');

const reportPath = path.resolve(__dirname, 'openrouter_report.md');

fs.writeFileSync(reportPath, `# OpenRouter Models Test Report\n\n| Model | Status (No Tools) | Error (No Tools) | Status (With Tools) | Error (With Tools) |\n|---|---|---|---|---|\n`);

async function testWithTimeout(body: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KEY}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errBody}`);
        }
        
        return await response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function run() {
    for (const model of models) {
        console.log(`Testing ${model}...`);
        
        let noToolStatus = 'OK';
        let noToolError = '-';
        let withToolStatus = 'OK';
        let withToolError = '-';

        // 1. No tool
        try {
            await testWithTimeout({
                model,
                messages: [{ role: 'user', content: 'Say hello in 1 word.' }],
                max_tokens: 10
            });
        } catch (e: any) {
            noToolStatus = 'FAIL';
            noToolError = e.message;
        }

        // 2. With tool
        try {
            const toolReq = await testWithTimeout({
                model,
                messages: [{ role: 'user', content: 'What is the weather like today? Use the web_search tool.' }],
                max_tokens: 50,
                tools: [{
                    type: "function",
                    function: {
                        name: "web_search",
                        description: "Search web",
                        parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                    }
                }],
                tool_choice: "auto"
            });
            
            const msg = toolReq?.choices?.[0]?.message;
            if (msg?.tool_calls?.length > 0) {
                withToolStatus = 'OK (Tools Used)';
            } else {
                withToolStatus = 'OK (Tools Ignored)';
            }
        } catch (e: any) {
            withToolStatus = 'FAIL';
            withToolError = e.message;
            
            if (e.message.includes('400') || e.message.includes('404') || e.message.includes('tools')) {
                withToolStatus = 'UNSUPPORTED';
            }
        }

        const row = `| ${model} | ${noToolStatus} | ${noToolError.replace(/\|/g, '\\|').replace(/\n/g, ' ').substring(0, 50)}... | ${withToolStatus} | ${withToolError.replace(/\|/g, '\\|').replace(/\n/g, ' ').substring(0, 50)}... |\n`;
        fs.appendFileSync(reportPath, row);
    }
    console.log(`Done! Report saved to ${reportPath}`);
}

run();
