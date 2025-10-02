# AI Chat Bot - Fixes and Improvements

## Overview
This document details all the fixes applied to resolve the routing issue where all chat requests were going to OpenAI instead of the selected AI model.

## Issues Fixed

### 1. **Missing Package Dependency**
- **Problem**: The `@google/generative-ai` package was not installed, causing TypeScript compilation errors
- **Solution**: Installed the missing package
```bash
npm install @google/generative-ai
```

### 2. **Model Not Passed When Starting Agent** ⭐ **PRIMARY ISSUE**
- **Problem**: When the AI agent was created via `/start-ai-agent` endpoint, the frontend was not passing the `model` parameter, causing the agent to always default to OpenAI
- **Location**: `frontend/src/hooks/use-ai-agent-status.tsx`
- **Solution**: 
  - Added `useModel()` hook to access selected model
  - Modified the `connectAgent` function to include the `model` parameter in the request body
  - Added `selectedModel` to the dependency array of the `useCallback`

**Before:**
```typescript
body: JSON.stringify({
  channel_id: channelId,
  channel_type: "messaging",
}),
```

**After:**
```typescript
body: JSON.stringify({
  channel_id: channelId,
  channel_type: "messaging",
  model: selectedModel,  // ✅ Now passes the selected model
}),
```

### 3. **Environment Variables Cleanup**
- **Problem**: Duplicate and improperly formatted environment variables
- **Solution**: Cleaned up `.env` file to remove duplicates and organize properly

### 4. **API Keys Configuration**
- **Verified API Keys**:
  - ✅ OpenAI API Key - Configured
  - ✅ Gemini API Key - Configured
  - ✅ OpenRouter API Key - Configured
  - ✅ Tavily API Key - Configured (for web search)
  - ⚠️ Anthropic API Key - Not configured (optional)

## How the Routing Works

### Backend Routing (Server)
The backend has a robust routing system with two implementations:

#### 1. **AIRouter** (`src/services/aiRouter.ts`)
- Uses service classes for each provider
- Detects provider based on model name patterns:
  - `gpt-*` or `openai/*` → OpenAI
  - `gemini-*` or `google/*` → Gemini
  - `claude-*` or `anthropic/*` → Claude
  - `meta-llama/*` or `llama-*` → OpenRouter (for LLaMA models)
  - `openrouter:*` → OpenRouter

#### 2. **LLMFactory** (`src/llm/llm-factory.ts`)
- Uses adapter pattern for different providers
- Similar routing logic as AIRouter

### Frontend Model Selection
1. User selects model from dropdown (`ModelSelector`)
2. Model is stored in context (`ModelContext`)
3. When connecting agent:
   - Model is passed to `/start-ai-agent` endpoint
   - Agent is created with the specific model
4. When sending messages:
   - Model is included in message `custom` field
   - LLMAgent uses the model for routing

## Testing Guide

### 1. Test Server Startup
```bash
cd server
npm run dev
```

Expected output should show:
- Server running on port 3000
- Model testing for all available models
- Success/failure status for each model

### 2. Test Model Routing via API
Test individual models:
```bash
# Test GPT-4o Mini
curl http://localhost:3000/test/gpt-4o-mini

# Test Gemini
curl http://localhost:3000/test/gemini-1.5-flash

# Test Claude (if API key configured)
curl http://localhost:3000/test/claude-3-5-sonnet-20241022

# Test LLaMA via OpenRouter
curl http://localhost:3000/test/meta-llama/llama-3-8b-instruct
```

### 3. Test Frontend Integration
```bash
cd frontend
npm run dev
```

Then:
1. Login or create an account
2. Create a new chat channel
3. Select a model from the dropdown (e.g., "Gemini 1.5 Flash")
4. Click "Connect" to start the AI agent
5. Send a test message
6. Check the browser console for model routing logs
7. Verify response comes from the selected model (not OpenAI)

### 4. Verify Model Usage in Logs
Check server console for logs like:
```
🎯 LLM Agent received request with model: gemini-1.5-flash
🔄 Routing request to gemini provider for model: gemini-1.5-flash
🤖 Gemini Service: Generating with model gemini-1.5-flash
```

## Supported Models

### OpenAI Models
- `gpt-4o` - GPT-4 Optimized
- `gpt-4o-mini` - Faster, cheaper GPT-4
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo

### Google Gemini Models
- `gemini-1.5-flash` - Fast, efficient
- `gemini-1.5-pro` - Most capable
- `gemini-1.0-pro` - Legacy version

### Anthropic Claude Models (Requires API Key)
- `claude-3-5-sonnet-20241022` - Latest Claude
- `claude-3-opus-20240229` - Most powerful
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and light

### Meta LLaMA Models (via OpenRouter)
- `meta-llama/llama-3-8b-instruct` - 8B parameter model
- `meta-llama/llama-3-70b-instruct` - 70B parameter model

### OpenRouter Models
- `openrouter:claude-3.5-sonnet` - Claude via OpenRouter
- `openrouter:llama-3.1-70b` - LLaMA via OpenRouter
- Any other OpenRouter supported models

## Architecture Overview

```
Frontend (React + TypeScript)
    ↓
ModelSelector Component
    ↓
ModelContext (stores selected model)
    ↓
useAIAgentStatus Hook (passes model to backend)
    ↓
POST /start-ai-agent { model: "gemini-1.5-flash" }
    ↓
Backend (Express + Node.js)
    ↓
LLMAgent (receives model parameter)
    ↓
AIRouter.routeRequest(model)
    ↓
Provider Services (OpenAI/Gemini/Claude/OpenRouter)
    ↓
AI Model Response
```

## Key Files Modified

1. **`server/.env`** - Cleaned up environment variables
2. **`frontend/src/hooks/use-ai-agent-status.tsx`** - Added model parameter to agent creation
3. **`server/package.json`** - Dependencies verified

## Configuration Requirements

### Required Environment Variables
```env
# Stream Chat
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# AI Models (at least one required)
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key

# Optional
ANTHROPIC_API_KEY=your_anthropic_key
TAVILY_API_KEY=your_tavily_key

# Server
PORT=3000
```

## Debugging Tips

### Check Model Selection
1. Open browser DevTools
2. Check Console for logs:
   - `[useAIAgentStatus] Starting agent with model: <model-name>`
   - `🎯 LLM Agent received request with model: <model-name>`
   - `🔄 Routing request to <provider> provider`

### Check Server Logs
1. Server should log on startup which models are available
2. Each request should show routing information
3. Provider-specific logs show which service is being used

### Common Issues

**Issue**: Model still goes to OpenAI
- **Check**: Is the agent restarted after selecting a new model?
- **Solution**: Disconnect and reconnect the agent after changing models

**Issue**: "API key not configured" error
- **Check**: Is the API key for that provider set in `.env`?
- **Solution**: Add the required API key to `server/.env`

**Issue**: TypeScript compilation errors
- **Check**: Are all dependencies installed?
- **Solution**: Run `npm install` in both `server` and `frontend`

## Performance & Monitoring

The application includes a metrics endpoint to monitor usage:
- **Endpoint**: `GET /metrics`
- **Metrics Tracked**:
  - Total requests
  - Average latency
  - Total tokens used
  - Total cost (USD)
  - Requests per model

Access via the "Stats" button in the UI or:
```bash
curl http://localhost:3000/metrics
```

## Next Steps

1. **Add More Models**: Extend the routing logic to support additional providers
2. **Model Performance Analytics**: Track which models perform best
3. **Cost Optimization**: Implement smart routing based on cost/performance
4. **Fallback Logic**: Auto-fallback to alternative models if primary fails
5. **Model Configuration UI**: Allow users to configure API keys via UI

## Summary

The primary issue was that the frontend was not passing the selected model when creating the AI agent. This has been fixed by:

1. ✅ Installing missing dependencies
2. ✅ Passing the `model` parameter when starting the agent
3. ✅ Cleaning up environment variables
4. ✅ Verifying the routing logic works correctly

All models should now route to their correct providers based on user selection. The application is ready for testing and deployment.

## Credits

Built with:
- **Stream Chat** - Real-time messaging
- **OpenAI API** - GPT models
- **Google Gemini API** - Gemini models
- **Anthropic API** - Claude models
- **OpenRouter** - Access to multiple models
- **Tavily API** - Web search capabilities
