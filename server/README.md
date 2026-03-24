# AI Chat Boat Server

This server provides an AI chat interface with support for multiple LLM providers through an adapter pattern.

## Features

- **Multi-Provider LLM Support**: Support for OpenAI and OpenRouter with easy extensibility
- **Dynamic Model Selection**: Choose models at runtime via request parameters
- **Usage Metrics**: Token usage tracking for all LLM calls
- **Function Calling**: Support for web search and other tools
- **Fallback Mechanism**: Automatic fallback to default provider if requested model is not supported

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Required: At least one LLM provider API key
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Web search functionality
TAVILY_API_KEY=your_tavily_api_key_here

# Stream Chat configuration
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here

# Server configuration
PORT=3000
```

## LLM Adapter Pattern

The server uses an adapter pattern to abstract LLM calls. This allows for:

1. **Easy Provider Switching**: Change between OpenAI, OpenRouter, or other providers
2. **Model Flexibility**: Use different models from different providers
3. **Consistent Interface**: All adapters implement the same interface
4. **Usage Tracking**: Token usage is tracked across all providers

### Supported Models

#### OpenAI Models
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`
- `gpt-3.5-turbo-16k`

#### OpenRouter Models
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/gpt-4-turbo`
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `anthropic/claude-3-haiku`
- `google/gemini-pro`
- `meta-llama/llama-3.1-70b-instruct`
- `meta-llama/llama-3.1-8b-instruct`

## API Endpoints

### GET `/models`
Returns supported models and the default model.

**Response:**
```json
{
  "supportedModels": ["gpt-4o", "anthropic/claude-3-opus", ...],
  "defaultModel": "gpt-4o"
}
```

### POST `/start-ai-agent`
Start an AI agent for a channel.

**Request Body:**
```json
{
  "channel_id": "your_channel_id",
  "channel_type": "messaging"
}
```

### POST `/stop-ai-agent`
Stop an AI agent for a channel.

**Request Body:**
```json
{
  "channel_id": "your_channel_id"
}
```

### GET `/agent-status`
Get the status of an AI agent.

**Query Parameters:**
- `channel_id`: The channel ID to check

**Response:**
```json
{
  "status": "connected" | "connecting" | "disconnected"
}
```

## Usage

### Selecting Models

To use a specific model, include it in the message's custom field:

```javascript
// Send a message with a specific model
await channel.sendMessage({
  text: "What's the latest news about AI?",
  custom: {
    model: "anthropic/claude-3-opus"
  }
});
```

### Usage Metrics

Usage metrics are automatically included in AI responses:

```javascript
// Response will include usage information
{
  text: "AI response content...",
  custom: {
    usage: {
      promptTokens: 150,
      completionTokens: 200,
      totalTokens: 350
    },
    model: "gpt-4o"
  }
}
```

## Architecture

```
src/
├── llm/
│   ├── types.ts              # LLM interfaces and types
│   ├── llm-factory.ts        # Factory for managing adapters
│   ├── adapters/
│   │   ├── openai-adapter.ts # OpenAI implementation
│   │   └── openrouter-adapter.ts # OpenRouter implementation
│   └── index.ts              # Exports
├── agents/
│   ├── llm-agent.ts          # New agent using LLM adapters
│   ├── openai/               # Legacy OpenAI agent
│   └── types.ts              # Agent interfaces
└── index.ts                  # Main server file
```

## Adding New Providers

To add a new LLM provider:

1. Create a new adapter in `src/llm/adapters/`
2. Implement the `LLMAdapter` interface
3. Add the adapter to the `LLMFactory` constructor
4. Update the `getSupportedModels()` method

Example:

```typescript
export class NewProviderAdapter implements LLMAdapter {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Implementation
  }
  
  supportsModel(model: string): boolean {
    // Check if model is supported
  }
  
  getDefaultModel(): string {
    return "default-model";
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run start
```
