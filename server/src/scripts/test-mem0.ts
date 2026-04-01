import { MemoryClient } from "mem0ai";
import * as dotenv from "dotenv";
import path from "path";

// Load the .env from the server root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runTest() {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    console.error("❌ MEM0_API_KEY is missing from .env");
    return;
  }

  console.log("🔑 Initializing Mem0 Client...");
  const mem0 = new (MemoryClient as any)({ apiKey });
  const testUserId = "test-user-999";

  try {
    console.log(`\n💾 1. Saving a new memory for user ${testUserId}...`);
    await mem0.add([
      { role: "user", content: "Hi! My name is Alex and my favorite color is crimson red." },
      { role: "assistant", content: "Nice to meet you, Alex! I'll remember your favorite color is crimson red." }
    ], { user_id: testUserId });
    console.log("✅ Memory saved successfully!");

    console.log(`\n🧠 2. Searching for memories related to 'color' for user ${testUserId}...`);
    const searchResult = await mem0.search("What is my favorite color?", { user_id: testUserId });
    
    // Ensure we handle the result correctly (sometimes it's an array, sometimes an object with 'data')
    const memories = Array.isArray(searchResult) ? searchResult : (searchResult as any).data || [];
    
    if (memories && memories.length > 0) {
      console.log("✅ Concept successfully retrieved:");
      memories.forEach((m: any, i: number) => {
        console.log(`   - Memory ${i + 1}: ${m.memory}`);
      });
    } else {
      console.log("⚠️ No memories found. Search returned empty.");
    }

  } catch (err: any) {
    console.error("❌ Test Failed:", err.message);
  }
}

runTest();
