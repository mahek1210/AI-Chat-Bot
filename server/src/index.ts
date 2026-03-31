import "dotenv/config";
import cors from "cors";

// Strictly validate required Gemini API Key on boot
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing or invalid in .env");
  process.exit(1);
}
import express from "express";
import { createAgent } from "./agents/createAgent";
import { AgentPlatform, AIAgent } from "./agents/types";
import { apiKey, serverClient } from "./serverClient";
import { getMetrics } from "./metrics";
import { LLMRequest } from "./llm/types";
import { AIRouter } from "./services/aiRouter";
import { BUILT_IN_PROFILES } from "./utils/ai-profiles";
import jwt from "jsonwebtoken";
import { readProfiles, writeProfiles } from "./utils/published-profiles";
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

// Authentication middleware to verify Stream Chat token
const authenticateWithStreamToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.STREAM_API_SECRET as string) as { user_id: string };
    req.user = { id: decoded.user_id };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }
};

// Map to store the AI Agent instances
// [user_id string]: AI Agent
const aiAgentCache = new Map<string, AIAgent>();
const pendingAiAgents = new Set<string>();

// TODO: temporary set to 8 hours, should be cleaned up at some point
const inactivityThreshold = 480 * 60 * 1000;
// Periodically check for inactive AI agents and dispose of them
setInterval(async () => {
  const now = Date.now();
  for (const [userId, aiAgent] of aiAgentCache) {
    if (now - aiAgent.getLastInteraction() > inactivityThreshold) {
      console.log(`Disposing AI Agent due to inactivity: ${userId}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(userId);
    }
  }
}, 5000);

app.get("/", (req, res) => {
  res.json({
    message: "AI Writing Assistant Server is running",
    apiKey: apiKey,
    activeAgents: aiAgentCache.size,
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", (req, res) => {
  try {
    const snapshot = getMetrics();
    res.json(snapshot);
  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

app.get("/models", (req, res) => {
  try {
    const aiRouter = new AIRouter();
    const supportedModels = aiRouter.getSupportedModels();
    const defaultModel = aiRouter.getDefaultModel();
    
    res.json({
      supportedModels,
      defaultModel,
    });
  } catch (error) {
    console.error("Error getting models:", error);
    res.status(500).json({
      error: "Failed to get supported models",
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all available AI profiles (built-in + published)
app.get("/profiles", async (req, res) => {
  try {
    const publishedProfiles = await readProfiles();
    
    // Deduplicate by ID — built-in wins
    const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
    const filteredPublished = publishedProfiles.filter(p => !builtInIds.has(p.id));
    
    let allProfiles = [...BUILT_IN_PROFILES, ...filteredPublished];
    
    // Cap at 100 profiles as requested
    if (allProfiles.length > 100) {
      allProfiles = allProfiles.slice(0, 100);
    }
    
    res.json({ profiles: allProfiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Publish a custom profile globally
app.post("/profiles/publish", authenticateWithStreamToken, async (req, res) => {
  try {
    const profile = req.body;
    
    if (!profile || !profile.id || !profile.name) {
      return res.status(400).json({ error: "Invalid profile data" });
    }

    // Reject if profile ID already exists in BUILT_IN_PROFILES
    if (BUILT_IN_PROFILES.some(p => p.id === profile.id)) {
      return res.status(400).json({ error: "Cannot override a built-in profile" });
    }

    // CRITICAL SECURITY RULE: ownerId must ALWAYS come from req.user
    profile.ownerId = req.user!.id;
    profile.isPublished = true;

    // Remove empty systemPrompts if they sneak in
    if (!profile.systemPrompt || profile.systemPrompt.trim() === '') {
      return res.status(400).json({ error: "System prompt is required" });
    }

    const profiles = await readProfiles();
    
    // Update or insert
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    if (existingIndex >= 0) {
      // If it exists, ensure the current user owns it
      if (profiles[existingIndex].ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden: You do not own this profile" });
      }
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }

    await writeProfiles(profiles);
    res.json({ message: "Profile published successfully", profile });
  } catch (error) {
    console.error("Error publishing profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a published custom profile
app.delete("/profiles/:id", authenticateWithStreamToken, async (req, res) => {
  try {
    const { id } = req.params;
    const profiles = await readProfiles();
    
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // CRITICAL SECURITY RULE: ownerId checked against req.user.id
    if (profiles[index].ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }

    // Remove from array and save
    profiles.splice(index, 1);
    await writeProfiles(profiles);
    
    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Toggle like on a published profile
app.post("/profiles/:id/like", authenticateWithStreamToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const profiles = await readProfiles();
    
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = profiles[index];
    const likedBy: string[] = profile.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike: remove userId
      profile.likedBy = likedBy.filter(uid => uid !== userId);
    } else {
      // Like: add userId
      profile.likedBy = [...likedBy, userId];
    }
    profile.likes = profile.likedBy.length;
    profiles[index] = profile;

    await writeProfiles(profiles);
    res.json({ 
      liked: !alreadyLiked, 
      likes: profile.likes,
      likedBy: profile.likedBy
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// List available Gemini models
app.get("/gemini-models", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "GEMINI_API_KEY not configured" });
    }
    
    res.json({ 
      message: "Gemini API key is configured",
      note: "Use /test/gemini-pro to test specific models"
    });
  } catch (error) {
    console.error("Error checking Gemini:", error);
    res.status(500).json({
      error: "Failed to check Gemini",
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test route for model testing
app.get("/test/:model", async (req, res) => {
  try {
    const { model } = req.params;
    const aiRouter = new AIRouter();
    
    console.log(`🧪 Testing model: ${model}`);
    
    const testRequest: LLMRequest = {
      messages: [
        {
          role: "user",
          content: "Hello from test",
        }
      ],
      model: model,
      temperature: 0.7,
      maxTokens: 100,
    };
    
    const startTime = Date.now();
    const response = await aiRouter.routeRequest(testRequest);
    const latency = Date.now() - startTime;
    
    console.log(`✅ Test successful for ${model} using ${response.provider} provider:`, {
      content: response.content,
      usage: response.usage,
      latency: `${latency}ms`
    });

    res.json({
      success: true,
      model,
      response: response.content,
      usage: response.usage,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Test failed for model ${req.params.model}:`, error);
    res.status(500).json({
      success: false,
      model: req.params.model,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Handle the request to start the AI Agent
 */
app.post("/start-ai-agent", async (req, res) => {
  const { channel_id, channel_type = "messaging", model, profileId, customProfilePrompt } = req.body;
  console.log(`[API] /start-ai-agent called for channel: ${channel_id} with model: ${model}, profile: ${profileId}`);

  // Simple validation
  if (!channel_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;

  try {
    // Prevent multiple agents from being created for the same channel simultaneously
    if (!aiAgentCache.has(user_id) && !pendingAiAgents.has(user_id)) {
      console.log(`[API] Creating new agent for ${user_id}`);
      pendingAiAgents.add(user_id);

      await serverClient.upsertUser({
        id: user_id,
        name: "AI Writing Assistant",
      });

      const channel = serverClient.channel(channel_type, channel_id);
      await channel.addMembers([user_id]);

      const agent = await createAgent(
        user_id,
        AgentPlatform.LLM,
        channel_type,
        channel_id,
        model,
        profileId,
        customProfilePrompt
      );

      await agent.init();
      // Final check to prevent race conditions where an agent might have been added
      // while this one was initializing.
      if (aiAgentCache.has(user_id)) {
        await agent.dispose();
      } else {
        aiAgentCache.set(user_id, agent);
      }
    } else {
      console.log(`AI Agent ${user_id} already started or is pending.`);
    }

    res.json({ message: "AI Agent started", data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to start AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to start AI Agent", reason: errorMessage });
  } finally {
    pendingAiAgents.delete(user_id);
  }
});

/**
 * Handle the request to stop the AI Agent
 */
app.post("/stop-ai-agent", async (req, res) => {
  const { channel_id } = req.body;
  console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);
  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
  try {
    const aiAgent = aiAgentCache.get(user_id);
    if (aiAgent) {
      console.log(`[API] Disposing agent for ${user_id}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(user_id);
    } else {
      console.log(`[API] Agent for ${user_id} not found in cache.`);
    }
    res.json({ message: "AI Agent stopped", data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to stop AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to stop AI Agent", reason: errorMessage });
  }
});

app.get("/agent-status", (req, res) => {
  const { channel_id } = req.query;
  if (!channel_id || typeof channel_id !== "string") {
    return res.status(400).json({ error: "Missing channel_id" });
  }
  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
  console.log(
    `[API] /agent-status called for channel: ${channel_id} (user: ${user_id})`
  );

  if (aiAgentCache.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connected`);
    res.json({ status: "connected" });
  } else if (pendingAiAgents.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connecting`);
    res.json({ status: "connecting" });
  } else {
    console.log(`[API] Status for ${user_id}: disconnected`);
    res.json({ status: "disconnected" });
  }
});

// Update agent model without restarting it
app.post("/update-agent-model", async (req, res) => {
  const { channel_id, model } = req.body;
  console.log(`[API] /update-agent-model called for channel: ${channel_id}, model: ${model}`);

  if (!channel_id || !model) {
    return res.status(400).json({ error: "Missing required fields: channel_id and model" });
  }

  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
  const aiAgent = aiAgentCache.get(user_id);

  if (!aiAgent) {
    return res.status(404).json({ error: "AI Agent not found for this channel" });
  }

  try {
    if (aiAgent.updateModel) {
      aiAgent.updateModel(model);
      console.log(`[API] Successfully updated model for ${user_id} to ${model}`);
      res.json({ message: "Agent model updated", model });
    } else {
      res.status(400).json({ error: "This agent type does not support model updates" });
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to update agent model", errorMessage);
    res.status(500).json({ error: "Failed to update agent model", reason: errorMessage });
  }
});

// Token provider endpoint - generates secure tokens
app.post("/token", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    // Create token with expiration (24 hours)
    // Subtract 60s from issuedAt to handle clock skew between this server and Stream's servers
    // Prevents "token used before issue at (iat)" error (Stream Chat error code 42)
    const now = Math.floor(Date.now() / 1000);
    const issuedAt = now - 60; // 60s back-dated to absorb any clock drift
    const expiration = now + 24 * 60 * 60; // 24 hours from now

    const token = serverClient.createToken(userId, expiration, issuedAt);

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({
      error: "Failed to generate token",
    });
  }
});

// Delete account endpoint
app.post("/delete-account", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    console.log(`[API] /delete-account called for userId: ${userId}`);

    // Stop any running agents for this user's channels
    for (const [agentUserId, aiAgent] of aiAgentCache) {
      try {
        await disposeAiAgent(aiAgent);
        aiAgentCache.delete(agentUserId);
      } catch (e) {
        console.warn(`Failed to dispose agent ${agentUserId}:`, e);
      }
    }

    // Delete user from Stream Chat
    await serverClient.deleteUser(userId, { hard_delete: true });

    console.log(`[API] Account deleted for userId: ${userId}`);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to delete account", errorMessage);
    res.status(500).json({ error: "Failed to delete account", reason: errorMessage });
  }
});

async function disposeAiAgent(aiAgent: AIAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await serverClient.deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Available endpoints: GET /, GET /metrics, GET /models, POST /start-ai-agent, POST /stop-ai-agent, GET /agent-status, POST /update-agent-model, POST /token, POST /delete-account`);
});

// Function to test all available models
async function testAllModels() {
  try {
    const llmFactory = new AIRouter();
    const supportedModels = llmFactory.getSupportedModels();
    
    console.log('\n🧪 Testing all available models...');
    console.log(`Found ${supportedModels.length} models: ${supportedModels.join(', ')}\n`);
    
    const testModels = [
      'gpt-4o-mini',
      'gemini-2.5-flash', 
      'claude-3-5-sonnet-20241022',
      'meta-llama/llama-3-8b-instruct'
    ];
    
    for (const model of testModels) {
      if (supportedModels.includes(model)) {
        try {
          const testRequest: LLMRequest = {
            messages: [{ role: 'user', content: 'Hello from test' }],
            model,
            temperature: 0.7,
            maxTokens: 50,
          };
          
          const startTime = Date.now();
          const response = await llmFactory.routeRequest(testRequest);
          const latency = Date.now() - startTime;
          
          console.log(`✅ ${model}: ${response.content.substring(0, 50)}... (${latency}ms)`);
        } catch (error) {
          console.log(`❌ ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log('\n🎉 Model testing completed!\n');
  } catch (error) {
    console.error('Error during model testing:', error);
  }
}
