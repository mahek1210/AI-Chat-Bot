# AI Chat Bot

A modern AI-powered chat application built with **Stream Chat** and **multiple AI providers** including OpenAI, Google Gemini, Anthropic Claude, and more. This full-stack application provides an intelligent writing assistant that can help with content creation, research, and real-time collaboration.

## 🚀 Features

- **Real-time Chat**: Powered by [GetStream.io](https://getstream.io) for seamless messaging
- **Multi-Provider AI**: Support for OpenAI GPT-4, Google Gemini, Anthropic Claude, and more
- **Web Search**: Live web search capabilities using Tavily API for current information
- **Modern UI**: Beautiful React interface with dark/light theme support
- **Writing Prompts**: Categorized writing prompts for business, content, communication, and creative tasks
- **Agent Management**: Dynamic AI agent lifecycle management
- **Secure Authentication**: JWT-based token authentication
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 🏗️ Architecture

### Backend (`server/`)

- **Node.js/Express** server
- **Stream Chat** server-side integration
- **Multi-Provider AI**: OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Tavily API** for web search functionality
- Agent management system with automatic cleanup

### Frontend (`frontend/`)

- **React** with TypeScript
- **Stream Chat React** components
- **Tailwind CSS** + **shadcn/ui** for modern styling
- **Vite** for fast development and building

## 📋 Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- GetStream.io account (free tier available)
- At least one AI provider API account:
  - OpenAI API account
  - Google AI Studio account (for Gemini)
  - Anthropic API account (for Claude)
  - OpenRouter account (for multiple providers)
- Tavily API account (for web search)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd chat-ai-app
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create environment file by copying the example:

```bash
cp .env.example .env
```

Configure your `.env` file with the following keys:

```env
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
```

**Note**: You only need to configure the API keys for the providers you want to use. At least one AI provider is required.

### 3. Testing AI Models

The application automatically tests all available models on server startup. You can also test individual models manually:

```bash
# Test OpenAI GPT-4o Mini
curl http://localhost:3000/test/gpt-4o-mini

# Test Google Gemini 1.5 Flash
curl http://localhost:3000/test/gemini-1.5-flash

# Test Anthropic Claude 3.5 Sonnet
curl http://localhost:3000/test/claude-3-5-sonnet-20241022

# Test Meta LLaMA 3 8B
curl http://localhost:3000/test/meta-llama/llama-3-8b-instruct

# Test OpenRouter models
curl http://localhost:3000/test/openrouter:claude-3.5-sonnet
```

The test endpoint will return a JSON response with the model's response, usage statistics, and latency.

**Automatic Testing**: When you start the server, it will automatically test all configured models and display the results in the console.

### 4. Frontend Setup

Navigate to the frontend directory:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Configure your `.env` file:

```env
# Stream Chat Configuration
VITE_STREAM_API_KEY=your_stream_api_key_here

# Backend URL
VITE_BACKEND_URL=http://localhost:3000
```

### 4. Getting API Keys

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

## 🚀 Running the Application

### Start the Backend Server

```bash
cd nodejs-ai-assistant
npm run dev
```

The backend will run on `http://localhost:3000`

### Start the Frontend Application

```bash
cd react-stream-ai-assistant
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

```mermaid
graph TD
    A[Frontend React App] --> B[Stream Chat React Components]
    B --> C[Stream Chat API]
    C --> D[Backend Node.js Server]
    D --> E[OpenAI API]
    D --> F[Tavily Web Search]
    D --> G[AI Agent Management]
```

### Key Features Used

- **Real-time Messaging**: Instant message delivery and updates
- **User Presence**: Online/offline status indicators
- **Channel Management**: Create, join, and manage chat channels
- **Message Threading**: Support for threaded conversations
- **File Uploads**: Share images and documents
- **Custom Fields**: Extended message and user data
- **Webhooks**: Server-side event handling

## 🤖 AI Agent System

The application features a sophisticated AI agent management system:

### Agent Lifecycle

1. **Creation**: AI agents are created per channel when requested
2. **Initialization**: OpenAI assistant setup with web search capabilities
3. **Message Handling**: Processes user messages and generates responses
4. **Web Search**: Automatically searches the web for current information
5. **Cleanup**: Automatic disposal after inactivity

### Agent Capabilities

- **Content Writing**: Various writing tasks from business to creative
- **Web Research**: Live search for current information and facts
- **Context Awareness**: Maintains conversation context
- **Customizable Prompts**: Specialized writing assistance

## 🎨 UI Components

The frontend uses modern UI components built with:

- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, customizable components
- **Lucide React**: Modern icon library
- **Dark Mode Support**: System preference detection

## 📡 API Endpoints

### Backend Routes

- `GET /` - Health check and server status
- `GET /models` - Get supported AI models
- `GET /test/:model` - Test a specific AI model with a sample prompt
- `POST /start-ai-agent` - Initialize AI agent for a channel
- `POST /stop-ai-agent` - Stop and cleanup AI agent
- `GET /agent-status` - Check AI agent status
- `POST /token` - Generate user authentication tokens

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Environment Variables**: Sensitive data protection
- **CORS Configuration**: Cross-origin request security
- **Token Expiration**: Automatic token refresh system
- **Input Validation**: Server-side validation for all requests

## 🚀 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Run `npm run start` for production
3. Ensure PORT is configured (defaults to 3000)

### Frontend Deployment

1. Run `npm run build` to create production build
2. Deploy the `dist` folder to your static hosting service
3. Configure environment variables for production

## 🛠️ Development

### Backend Development

```bash
cd server
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Starts Vite dev server
```

### Building for Production

```bash
# Backend
cd server
npm run start

# Frontend
cd frontend
npm run build
```

## 📚 Technologies Used

### Backend

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Stream Chat** - Real-time messaging
- **OpenAI** - AI language model
- **Axios** - HTTP client
- **CORS** - Cross-origin resource sharing
- **TypeScript** - Type safety

### Frontend

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Stream Chat React** - Chat UI components
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **React Hook Form** - Form handling
- **React Router** - Navigation

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

- Check the [GetStream.io Documentation](https://getstream.io/chat/docs/)
- Review [OpenAI API Documentation](https://platform.openai.com/docs)
- Create an issue in this repository

---

Built with ❤️ using GetStream.io, OpenAI, and modern web technologies.
