# 🚀 Quick Start Guide - AI Chat Bot

## ✅ Problem Solved!

**The routing issue has been completely fixed.** All requests now go to the selected AI model instead of defaulting to OpenAI.

---

## 🎯 What Was Fixed

### The Main Issue
The frontend was not passing the `model` parameter when creating the AI agent, causing all requests to default to OpenAI.

### The Fix
Updated `frontend/src/hooks/use-ai-agent-status.tsx` to include the selected model when starting the agent.

**Result**: ✅ **Perfect model routing - requests now go to the correct AI provider!**

---

## 🏃 Run the Project

### Prerequisites
- Node.js 20+
- MongoDB (running on localhost:27017)
- Redis (optional but configured)

### 1. Start Backend
```bash
cd server
npm install  # If not already done
npm run dev
```

**Server starts on**: `http://localhost:3000`

### 2. Start Frontend
```bash
cd frontend
npm install  # If not already done
npm run dev
```

**Frontend starts on**: `http://localhost:5173`

---

## 🎮 How to Use

### Step 1: Access the App
Open your browser and go to: `http://localhost:5173`

### Step 2: Login/Register
Create an account or login with existing credentials

### Step 3: Create a Channel
Click "New Chat" to create a new conversation channel

### Step 4: **Select Your AI Model** 🎯
Click the model dropdown in the header and choose your desired model:
- **GPT-4o Mini** (OpenAI)
- **Gemini 1.5 Flash** (Google)
- **Claude 3.5 Sonnet** (Anthropic - if configured)
- **LLaMA 3 8B** (OpenRouter/Meta)
- Many more...

### Step 5: Connect the Agent
Click the **"Connect"** button to start the AI agent with your selected model

### Step 6: Start Chatting!
Send messages and get responses from your chosen AI model

---

## 🔍 Verify It's Working

### Check Browser Console
You should see:
```
[useAIAgentStatus] Starting agent with model: gemini-1.5-flash
Selected model in frontend: gemini-1.5-flash
```

### Check Server Console
You should see:
```
🎯 LLM Agent received request with model: gemini-1.5-flash
🔄 Routing request to gemini provider for model: gemini-1.5-flash
🤖 Gemini Service: Generating with model gemini-1.5-flash
```

### Check Response Style
Different models have different response patterns:
- **GPT models**: Detailed, structured responses
- **Gemini**: Fast, conversational responses
- **Claude**: Thoughtful, nuanced responses
- **LLaMA**: Open-source alternative responses

---

## 🎛️ Available Models

### OpenAI (OPENAI_API_KEY required)
- `gpt-4o` - Most capable
- `gpt-4o-mini` - Fast and efficient
- `gpt-4-turbo` - Advanced reasoning
- `gpt-4` - Powerful model
- `gpt-3.5-turbo` - Fast and affordable

### Google Gemini (GEMINI_API_KEY required)
- `gemini-1.5-flash` - Fast responses
- `gemini-1.5-pro` - Most capable
- `gemini-1.0-pro` - Stable version

### Anthropic Claude (ANTHROPIC_API_KEY required)
- `claude-3-5-sonnet-20241022` - Latest and best
- `claude-3-opus-20240229` - Most intelligent
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and light

### OpenRouter (OPENROUTER_API_KEY required)
- `meta-llama/llama-3-8b-instruct` - LLaMA 3 8B
- `meta-llama/llama-3-70b-instruct` - LLaMA 3 70B
- `openrouter:claude-3.5-sonnet` - Claude via OpenRouter
- Many more models available

---

## ⚙️ Configuration

### Environment Variables
Check `server/.env` for configuration. Currently configured:
- ✅ Stream Chat API
- ✅ OpenAI API (quota issue - needs credits)
- ✅ Gemini API
- ✅ OpenRouter API
- ✅ Tavily API (web search)
- ⚠️ Anthropic API (not configured)

### Add API Keys
To use a provider, ensure its API key is in `server/.env`:
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
```

---

## 🧪 Test the Server

### Check Server Status
```bash
curl http://localhost:3000
```

### Get Available Models
```bash
curl http://localhost:3000/models
```

### Test a Specific Model
```bash
# Test GPT-4o Mini
curl http://localhost:3000/test/gpt-4o-mini

# Test Gemini
curl http://localhost:3000/test/gemini-1.5-flash
```

---

## 💡 Tips

### Switching Models
1. Disconnect current agent (click "Disconnect")
2. Select new model from dropdown
3. Reconnect agent (click "Connect")
4. Send a message to test

### Model Not Working?
- Check if the API key is configured in `.env`
- Check if you have quota/credits for that provider
- Check server console for error messages

### Best Practices
- **GPT-4o-mini**: Best for quick, cost-effective responses
- **Gemini 1.5 Flash**: Great for fast, natural conversations
- **Claude 3.5 Sonnet**: Best for detailed, thoughtful analysis
- **LLaMA (OpenRouter)**: Good open-source alternative

---

## 📊 Monitoring

### View Metrics
Click the **"Stats"** button in the UI or visit:
```bash
curl http://localhost:3000/metrics
```

See:
- Total requests
- Average latency
- Token usage
- Cost estimates
- Requests per model

---

## 🐛 Common Issues

### "Port already in use"
```bash
# Windows
taskkill /F /IM node.exe

# Then restart the server
```

### "API key not configured"
Add the missing API key to `server/.env`

### "Quota exceeded"
Add credits to your API provider account or use a different provider

### Model still going to wrong provider
1. Make sure to **disconnect** the agent first
2. Select the new model
3. **Reconnect** the agent
4. Then send your message

---

## 📝 What Changed

### Files Modified
1. **Frontend**: `src/hooks/use-ai-agent-status.tsx` - Added model parameter
2. **Backend**: `src/services/aiRouter.ts` - Improved service initialization
3. **Backend**: `src/services/claudeService.ts` - Fixed TypeScript errors
4. **Backend**: `src/services/openrouterService.ts` - Fixed TypeScript errors
5. **Server**: `.env` - Cleaned up configuration

### New Files
1. `FIXES_AND_IMPROVEMENTS.md` - Detailed documentation
2. `PROJECT_STATUS.md` - Complete status report
3. `QUICK_START.md` - This file

---

## ✨ Success!

Your AI Chat Bot is now **fully operational** with correct model routing! 

Enjoy using multiple AI models in one application! 🎉

---

**Questions?** Check:
- `PROJECT_STATUS.md` - Complete project status
- `FIXES_AND_IMPROVEMENTS.md` - Detailed technical documentation
- Server console - For routing logs
- Browser console - For frontend logs

**Happy Chatting!** 🤖💬
