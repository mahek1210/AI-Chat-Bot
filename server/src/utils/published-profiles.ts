import fs from 'fs/promises';
import path from 'path';
import { AIProfile } from './ai-profiles';

// Ensure the data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
const PROFILES_FILE = path.join(DATA_DIR, 'published-profiles.json');

// Initialize data directory
async function init() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}
init().catch(console.error);

/**
 * Reads all published profiles safely.
 */
export async function readProfiles(): Promise<AIProfile[]> {
  try {
    const data = await fs.readFile(PROFILES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File does not exist yet
    }
    console.error('Error reading published profiles:', error);
    return [];
  }
}

// In-memory mutex for atomic sequential writes
let writeQueue = Promise.resolve();

/**
 * Writes profiles atomically to prevent corruption.
 */
export function writeProfiles(profiles: AIProfile[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tmpFile = PROFILES_FILE + '.tmp';
    try {
      // 1. Write to temp file
      await fs.writeFile(tmpFile, JSON.stringify(profiles, null, 2), 'utf-8');
      // 2. Atomic rename
      await fs.rename(tmpFile, PROFILES_FILE);
    } catch (error) {
      console.error('Failed to write published profiles atomically:', error);
      throw error;
    }
  }).catch(err => {
    console.error('Write queue caught error:', err);
    throw err;
  });
  
  return writeQueue;
}
