# AI Chat Bot

A modern AI-powered chat application built with **Stream Chat** and **multiple AI providers** including OpenAI, Google Gemini, Anthropic Claude, and more. This full-stack application provides an intelligent writing assistant that can help with content creation, research, and real-time collaboration. It features **persistent AI memory** powered by Mem0, **database storage** with Supabase, and an upgraded **Google GenAI SDK** for the latest Gemini models.

**Live link** : https://ai-chat-bot-two-puce.vercel.app/

## 🚀 Features

* **Real-time Chat**: Powered by [GetStream.io](https://getstream.io) for seamless messaging
* **Multi-Provider AI**: Support for OpenAI GPT-4, Google Gemini, Anthropic Claude, Meta LLaMA, and more
* **Web Search**: Live web search capabilities using Tavily API for current information
* **Persistent AI Memory**: Powered by [Mem0](https://mem0.ai) — AI agents remember user preferences and adapt over time
* **Supabase Integration**: PostgreSQL database for persistent chat history, user data, and storage
* **Modern UI**: Beautiful React interface with dark/light theme support
* **Writing Prompts**: Categorized writing prompts for business, content, communication, and creative tasks
* **Agent Management**: Dynamic AI agent lifecycle management
* **Secure Authentication**: JWT-based token authentication
* **Responsive Design**: Mobile-first design with Tailwind CSS

## 🏗️ Architecture

### Backend (`server/`)

* **Node.js/Express** server
* **Stream Chat** server-side integration
* **Multi-Provider AI**: OpenAI, Google Gemini (via `@google/genai` SDK), Anthropic Claude, OpenRouter
* **Tavily API** for web search functionality
* **Mem0** for persistent AI memory and personalized agent interactions
* **Supabase** for database storage and user data persistence
* Agent management system with automatic cleanup

### Frontend (`frontend/`)

* **React** with TypeScript
* **Stream Chat React** components
* **Tailwind CSS** + **shadcn/ui** for modern styling
* **Vite** for fast development and building

## 📋 Prerequisites

* Node.js 20 or higher
* npm or yarn package manager
* GetStream.io account (free tier available)
* At least one AI provider API account:
  + OpenAI API account
  + Google AI Studio account (for Gemini)
  + Anthropic API account (for Claude)
  + OpenRouter account (for multiple providers)
* Tavily API account (for web search)
* Supabase account (free tier available) — for database and storage
* Mem0 API account — for persistent AI memory

## 🛠️ Setup Instructions

### 1. Clone the Repository

```
git clone <your-repository-url>
cd chat-ai-app
```

### 2. Backend Setup

Navigate to the backend directory:

```
cd server
```

Install dependencies:

```
npm install
```

Create environment file by copying the example:

```
cp .env.example .env
```

Configure your `.env` file with the following keys:

```
# Server Configuration
PORT=3000

# GetStream credentials - Get these from https://getstream.io/dashboard
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here

# OpenAI API key - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API key - Get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_google_api_key_here
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Anthropic Claude API key - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_BASE_URL=https://api.anthropic.com

# Meta LLaMA API key - Get from https://openrouter.ai/
LLAMA_API_KEY=your_llama_api_key_here
LLAMA_BASE_URL=https://openrouter.ai/api/v1

# OpenRouter API key (optional) - Get from https://openrouter.ai/
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Tavily API key - Get from https://tavily.com
TAVILY_API_KEY=your_tavily_api_key_here

# Supabase credentials - Get from https://supabase.com/dashboard
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Mem0 API key - Get from https://app.mem0.ai/
MEM0_API_KEY=your_mem0_api_key_here
```

**Note**: You only need to configure the API keys for the providers you want to use. At least one AI provider is required. Supabase and Mem0 are required for persistent memory and storage features.

### 3. Supabase Setup

Navigate to [Supabase](https://supabase.com) and create a new project:

1. Sign up or log in at [supabase.com](https://supabase.com)
2. Create a new project from the dashboard
3. Go to **Project Settings → API** to copy your:
   + **Project URL** → `SUPABASE_URL`
   + **Anon / Public key** → `SUPABASE_ANON_KEY`
   + **Service Role key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Add all three values to your backend `.env` file

### 4. Mem0 Memory Setup

Set up persistent AI memory with [Mem0](https://mem0.ai):

1. Sign up at [app.mem0.ai](https://app.mem0.ai)
2. Create a new project or API key from the dashboard
3. Copy your **API Key** → `MEM0_API_KEY`
4. Add it to your backend `.env` file

**How Mem0 works in this app**: Each AI agent stores conversation memories (preferences, context, history summaries) per user. On subsequent conversations, the agent retrieves relevant memories to provide personalized, context-aware responses without requiring the user to repeat themselves.

### 5. Testing AI Models

The application automatically tests all available models on server startup. You can also test individual models manually:

```
# Test OpenAI GPT-4o Mini
curl http://localhost:3000/test/gpt-4o-mini

# Test Google Gemini 2.5 Flash
curl http://localhost:3000/test/gemini-2.5-flash

# Test Anthropic Claude 3.5 Sonnet
curl http://localhost:3000/test/claude-3-5-sonnet-20241022

# Test Meta LLaMA 3 8B
curl http://localhost:3000/test/meta-llama/llama-3-8b-instruct

# Test OpenRouter models
curl http://localhost:3000/test/openrouter:claude-3.5-sonnet
```

The test endpoint will return a JSON response with the model's response, usage statistics, and latency.

**Automatic Testing**: When you start the server, it will automatically test all configured models and display the results in the console.

### 6. Frontend Setup

Navigate to the frontend directory:

```
cd ../frontend
```

Install dependencies:

```
npm install
```

Create environment file:

```
cp .env.example .env
```

Configure your `.env` file:

```
# Stream Chat Configuration
VITE_STREAM_API_KEY=your_stream_api_key_here

# Backend URL
VITE_BACKEND_URL=http://localhost:3000
```

### 7. Getting API Keys

#### GetStream.io Setup

1. Sign up at [GetStream.io](https://getstream.io/chat/trial/)
2. Create a new Chat application
3. Copy your **API Key** and **API Secret** from the dashboard
4. Use the same **API Key** in both backend and frontend `.env` files

#### OpenAI API Setup

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Add it to your backend `.env` file

#### Tavily API Setup

1. Sign up at [Tavily](https://tavily.com/)
2. Get your API key from the dashboard
3. Add it to your backend `.env` file

#### Supabase Setup

1. Sign up at [Supabase](https://supabase.com)
2. Create a new project from the dashboard
3. Go to **Settings → API** and copy your Project URL, Anon Key, and Service Role Key
4. Add all three to your backend `.env` file

#### Mem0 Setup

1. Sign up at [Mem0](https://app.mem0.ai)
2. Generate an API key from the dashboard
3. Add it to your backend `.env` file

## 🚀 Running the Application

### Start the Backend Server

```
cd server
npm run dev
```

The backend will run on `http://localhost:3000`

### Start the Frontend Application

```
cd frontend
npm run dev
```

The frontend will run on `http://localhost:8080`

## 📖 How GetStream.io Works

[GetStream.io](https://getstream.io) is a cloud-based API service that provides real-time chat functionality. Here's how it integrates with our app:

### Core Concepts

1. **Stream Chat Client**: Handles all chat operations and real-time updates
2. **Channels**: Individual chat rooms where messages are exchanged
3. **Users**: Authenticated participants in the chat
4. **Messages**: Text, files, reactions, and custom data
5. **Tokens**: JWT-based authentication for secure access

### Integration Flow

```
graph TD
    A[Frontend React App] --> B[Stream Chat React Components]
    B --> C[Stream Chat API]
    C --> D[Backend Node.js Server]
    D --> E[OpenAI / Gemini / Claude API]
    D --> F[Tavily Web Search]
    D --> G[AI Agent Management]
    D --> H[Mem0 Memory Layer]
    D --> I[Supabase Database]
```

### Key Features Used

* **Real-time Messaging**: Instant message delivery and updates
* **User Presence**: Online/offline status indicators
* **Channel Management**: Create, join, and manage chat channels
* **Message Threading**: Support for threaded conversations
* **File Uploads**: Share images and documents
* **Custom Fields**: Extended message and user data
* **Webhooks**: Server-side event handling

## 🧠 Mem0 Persistent Memory System

The application integrates [Mem0](https://mem0.ai) to give AI agents a persistent, intelligent memory layer:

### How Memory Works

1. **Memory Storage**: After each interaction, important context (user preferences, past topics, writing styles) is saved to Mem0
2. **Memory Retrieval**: When a new message arrives, relevant past memories are fetched and injected into the AI's context window
3. **Personalization**: The AI adapts its tone, suggestions, and knowledge to each individual user over time
4. **Cross-Session Continuity**: Memories persist across sessions — users don't need to re-explain their preferences

### Memory Capabilities

* **User Preferences**: Remembers preferred writing styles, tone, and formats
* **Context Retention**: Retains topic context and prior research across conversations
* **Adaptive Responses**: Continuously improves response quality based on interaction history
* **Per-User Isolation**: Each user has their own private memory store

## 🗄️ Supabase Database Integration

The application uses [Supabase](https://supabase.com) as its backend database and storage layer:

### What Supabase Powers

* **Persistent Chat History**: All conversations are stored and retrievable across sessions
* **User Data Storage**: User profiles, settings, and preferences
* **File Storage**: Uploaded files and media are stored in Supabase Storage
* **Real-time Sync**: Supabase real-time subscriptions keep data in sync across clients

### Supabase Features Used

* **PostgreSQL Database**: Structured data storage for users, channels, and messages
* **Supabase Storage**: File and image uploads
* **Row-Level Security (RLS)**: Fine-grained access control per user
* **Real-time Subscriptions**: Live data updates without polling

## 🤖 AI Agent System

The application features a sophisticated AI agent management system:

### Agent Lifecycle

1. **Creation**: AI agents are created per channel when requested
2. **Initialization**: AI assistant setup with web search and memory capabilities
3. **Memory Loading**: Past user memories are retrieved from Mem0 on agent start
4. **Message Handling**: Processes user messages and generates responses
5. **Web Search**: Automatically searches the web for current information
6. **Memory Saving**: New context and preferences are saved to Mem0 after each interaction
7. **Cleanup**: Automatic disposal after inactivity

### Agent Capabilities

* **Content Writing**: Various writing tasks from business to creative
* **Web Research**: Live search for current information and facts
* **Context Awareness**: Maintains conversation context with persistent memory
* **Customizable Prompts**: Specialized writing assistance
* **Personalized Responses**: Adapts to each user's style and preferences using Mem0

## 🎨 UI Components

The frontend uses modern UI components built with:

* **Radix UI**: Accessible component primitives
* **Tailwind CSS**: Utility-first CSS framework
* **shadcn/ui**: Beautiful, customizable components
* **Lucide React**: Modern icon library
* **Dark Mode Support**: System preference detection

## 📡 API Endpoints

### Backend Routes

* `GET /` - Health check and server status
* `GET /models` - Get supported AI models
* `GET /test/:model` - Test a specific AI model with a sample prompt
* `POST /start-ai-agent` - Initialize AI agent for a channel
* `POST /stop-ai-agent` - Stop and cleanup AI agent
* `GET /agent-status` - Check AI agent status
* `POST /token` - Generate user authentication tokens
* `GET /memory/:userId` - Retrieve stored memories for a user
* `DELETE /memory/:userId` - Clear all memories for a user

## 🔒 Security Features

* **JWT Authentication**: Secure token-based authentication
* **Environment Variables**: Sensitive data protection
* **CORS Configuration**: Cross-origin request security
* **Token Expiration**: Automatic token refresh system
* **Input Validation**: Server-side validation for all requests
* **Supabase RLS**: Row-level security policies for database access control
* **Per-User Memory Isolation**: Mem0 memory stores are isolated per user

## 🚀 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform (including Supabase and Mem0 keys)
2. Run `npm run start` for production
3. Ensure PORT is configured (defaults to 3000)

### Frontend Deployment

1. Run `npm run build` to create production build
2. Deploy the `dist` folder to your static hosting service
3. Configure environment variables for production

## 🛠️ Development

### Backend Development

```
cd server
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development

```
cd frontend
npm run dev  # Starts Vite dev server
```

### Building for Production

```
# Backend
cd server
npm run start

# Frontend
cd frontend
npm run build
```

## 📚 Technologies Used

### Backend

* **Node.js** - Runtime environment
* **Express** - Web framework
* **Stream Chat** - Real-time messaging
* **OpenAI** - AI language model
* **@google/genai** - Google GenAI SDK for Gemini models
* **Mem0** (`mem0ai`) - Persistent AI memory layer
* **Supabase** (`@supabase/supabase-js`) - Database and storage
* **Axios** - HTTP client
* **CORS** - Cross-origin resource sharing
* **TypeScript** - Type safety

### Frontend

* **React** - UI library
* **TypeScript** - Type safety
* **Vite** - Build tool
* **Stream Chat React** - Chat UI components
* **Tailwind CSS** - Styling
* **Radix UI** - Accessible components
* **React Hook Form** - Form handling
* **React Router** - Navigation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

* Check the [GetStream.io Documentation](https://getstream.io/chat/docs/)
* Review [OpenAI API Documentation](https://platform.openai.com/docs)
* Review [Supabase Documentation](https://supabase.com/docs)
* Review [Mem0 Documentation](https://docs.mem0.ai)
* Create an issue in this repository

---

Built with ❤️ using GetStream.io, OpenAI, Google Gemini, Anthropic Claude, Supabase, and Mem0.
