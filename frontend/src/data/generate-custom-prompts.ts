/**
 * generate-custom-prompts.ts
 *
 * Derives 4 starter-prompt tabs from a custom persona's name, category, and
 * system instructions — mirroring the hard-coded tabs built-in personas use.
 *
 * No network calls needed: everything runs client-side.
 */

import { CustomPromptTab } from './ai-profiles';

// ── Category seed data (tab themes + example prompt templates) ─────────────

const CATEGORY_SEEDS: Record<
  string,
  {
    tabs: { id: string; icon: string; title: string; promptTemplates: string[] }[];
  }
> = {
  Professional: {
    tabs: [
      {
        id: 'advice', icon: '💼', title: 'Expert Advice',
        promptTemplates: [
          'What is the single most impactful thing I can do right now as a {name}?',
          'Give me a step-by-step plan to solve my biggest professional challenge',
          'How would you approach a situation where I need to [describe situation]?',
          'What are the top 3 mistakes people make in your area of expertise?',
        ],
      },
      {
        id: 'strategy', icon: '🎯', title: 'Strategy',
        promptTemplates: [
          'Help me build a 90-day action plan for [your goal]',
          'What frameworks do you use when analysing a complex problem?',
          'How do I prioritise when everything feels urgent?',
          'Walk me through a strategic decision I am facing: [describe it]',
        ],
      },
      {
        id: 'review', icon: '🔍', title: 'Review & Feedback',
        promptTemplates: [
          'Review this and tell me what is missing or weak: [paste your work]',
          'What would a top expert say is wrong with my approach?',
          'Give me brutally honest feedback on [describe your idea or document]',
          'How can I make this 10× better? [paste content]',
        ],
      },
      {
        id: 'growth', icon: '📈', title: 'Growth',
        promptTemplates: [
          'What skills should I build to reach the next level in this field?',
          'How do the best people in your domain think differently from average ones?',
          'What are the hidden knowledge gaps that hold people back?',
          'Give me a reading/learning list for becoming excellent in your area',
        ],
      },
    ],
  },
  Fun: {
    tabs: [
      {
        id: 'jokes', icon: '😂', title: 'Jokes & Roasts',
        promptTemplates: [
          'Roast me based on [describe something about yourself]',
          'Give me 5 jokes about [topic] that are actually funny',
          'Write the most chaotic take on [mundane situation]',
          'Create a comedy bit about [your pet peeve]',
        ],
      },
      {
        id: 'games', icon: '🎮', title: 'Games & Creativity',
        promptTemplates: [
          'Let\'s play a word game — you start',
          'Give me the most absurd "Would you rather" question imaginable',
          'Invent a completely useless superpower and explain why it\'s actually great',
          'Tell me a two-sentence horror story, but make it funny',
        ],
      },
      {
        id: 'hot_takes', icon: '🔥', title: 'Hot Takes',
        promptTemplates: [
          'Give me your most controversial opinion about [topic]',
          'Defend something everyone hates — make me agree with it',
          'What is the most overrated thing in the world right now?',
          'Take the most boring topic and make it sound epic and dramatic',
        ],
      },
      {
        id: 'stories', icon: '📖', title: 'Stories',
        promptTemplates: [
          'Write a short story where [ordinary thing] saves the world',
          'Tell me the plot of a terrible movie that somehow won an Oscar',
          'Write a dramatic narrator voice description of me making breakfast',
          'Give me a fairy tale but set in a modern office',
        ],
      },
    ],
  },
  Knowledge: {
    tabs: [
      {
        id: 'explain', icon: '🧠', title: 'Explain It',
        promptTemplates: [
          'Explain [complex concept] like I am 12 years old',
          'What is the most counterintuitive fact in your domain?',
          'Break down [topic] from first principles',
          'How does [X] actually work under the hood?',
        ],
      },
      {
        id: 'deep_dive', icon: '🔬', title: 'Deep Dive',
        promptTemplates: [
          'Give me the advanced version of [topic] that most people never learn',
          'What do experts know about [subject] that beginners get wrong?',
          'Walk me through the history and evolution of [concept]',
          'What are the open questions or mysteries still unsolved in this field?',
        ],
      },
      {
        id: 'debate', icon: '⚖️', title: 'Debate',
        promptTemplates: [
          'Argue both sides of [controversial topic in this domain]',
          'Steel-man the position I disagree with on [topic]',
          'What is the strongest argument against your own expertise?',
          'Where do smart people in your field most commonly disagree?',
        ],
      },
      {
        id: 'quiz', icon: '🎓', title: 'Quiz Me',
        promptTemplates: [
          'Quiz me on [topic] — start easy and get progressively harder',
          'Ask me a question that separates beginners from experts in your field',
          'Give me a thought experiment related to your area of knowledge',
          'What is a question in your domain that has no clear right answer?',
        ],
      },
    ],
  },
  Spiritual: {
    tabs: [
      {
        id: 'guidance', icon: '🙏', title: 'Guidance',
        promptTemplates: [
          'I am feeling [emotion] — what wisdom do you offer?',
          'How do I find peace when [difficult situation]?',
          'Guide me through a moment of stillness and reflection',
          'What does spiritual wisdom say about [life challenge]?',
        ],
      },
      {
        id: 'wisdom', icon: '📿', title: 'Wisdom',
        promptTemplates: [
          'Share a teaching that changed how you see suffering',
          'What is the deepest truth you carry about [spiritual concept]?',
          'How do I practice [spiritual principle] in everyday life?',
          'Give me a quote that speaks directly to [what I am going through]',
        ],
      },
      {
        id: 'practice', icon: '🧘', title: 'Practice',
        promptTemplates: [
          'Guide me through a 5 minute practice to calm my mind',
          'What daily ritual would most transform my inner life?',
          'How do I build a morning spiritual practice I will actually keep?',
          'Teach me a technique for dealing with anxious thoughts right now',
        ],
      },
      {
        id: 'questions', icon: '✨', title: 'Deep Questions',
        promptTemplates: [
          'What is the meaning of all this — really?',
          'How do I reconcile [doubt or conflict] with my inner path?',
          'What do you believe happens after we die?',
          'How do I live more intentionally and less on autopilot?',
        ],
      },
    ],
  },
  Entertainment: {
    tabs: [
      {
        id: 'reviews', icon: '⭐', title: 'Reviews',
        promptTemplates: [
          'Give me your most dramatic review of [movie/show/song]',
          'Rank [genre] films on a 10-point scale with strong opinions',
          'What is the most underrated [entertainment type] of the last decade?',
          'Review [classic] as if it were released today — would it survive?',
        ],
      },
      {
        id: 'recommendations', icon: '🎬', title: 'Recommendations',
        promptTemplates: [
          'Recommend 5 hidden gems I have probably never heard of',
          'What should I watch/listen to if I love [title]?',
          'Give me a watch list for [mood or situation]',
          'What is the one piece of entertainment that absolutely changed you?',
        ],
      },
      {
        id: 'debate', icon: '🍿', title: 'Hot Takes',
        promptTemplates: [
          'Defend [widely disliked thing] — make me appreciate it',
          'Is [popular thing] actually overrated? Give me the honest take',
          'Who is the GOAT of [genre/medium] and why?',
          'What cancelled or forgotten [show/artist] deserved better?',
        ],
      },
      {
        id: 'analysis', icon: '🎭', title: 'Analysis',
        promptTemplates: [
          'Break down the themes and symbolism in [title]',
          'Why does [work] hit so different emotionally — analyse it',
          'What makes [creator\'s] style so distinctive?',
          'How did [era] shape the entertainment landscape permanently?',
        ],
      },
    ],
  },
  Sports: {
    tabs: [
      {
        id: 'analysis', icon: '📊', title: 'Analysis',
        promptTemplates: [
          'Break down the tactics in [match/game] that made the difference',
          'What stats actually matter vs ones that are misleading?',
          'Analyse [player]\'s playing style and what makes them elite',
          'How has the game changed tactically in the last decade?',
        ],
      },
      {
        id: 'goat', icon: '🐐', title: 'GOAT Debates',
        promptTemplates: [
          'Who is the greatest [position/role] of all time — defend your answer',
          'Compare [Player A] vs [Player B] across all dimensions',
          'What era produced the toughest competition in [sport]?',
          'Rank the top 5 [players/teams] with reasoning',
        ],
      },
      {
        id: 'moments', icon: '🏆', title: 'Greatest Moments',
        promptTemplates: [
          'Relive the greatest [match type] you have ever seen',
          'What is the most dramatic comeback in [sport] history?',
          'Describe the moment [iconic event] happened — make me feel it',
          'What performance gave you goosebumps above all others?',
        ],
      },
      {
        id: 'news', icon: '📰', title: 'Latest & Debates',
        promptTemplates: [
          'What is the biggest talking point in [sport] right now?',
          'Who is the most exciting young talent to watch?',
          'Should [club/team] have made [decision]? Give me your take',
          'What is the most controversial call or decision in recent memory?',
        ],
      },
    ],
  },
  Custom: {
    tabs: [
      {
        id: 'intro', icon: '👋', title: 'Get Started',
        promptTemplates: [
          'What can you help me with as a {name}?',
          'What is the most common question people come to you with?',
          'Tell me something surprising about your area of expertise',
          'What is the first thing I should know when working with you?',
        ],
      },
      {
        id: 'advice', icon: '💡', title: 'Expert Advice',
        promptTemplates: [
          'Give me your best advice on [topic in your domain]',
          'What is the mistake most people make that you wish they would not?',
          'Walk me through how you would solve [problem in your area]',
          'What would you recommend for someone just starting out?',
        ],
      },
      {
        id: 'explore', icon: '🔍', title: 'Explore',
        promptTemplates: [
          'What are the most fascinating aspects of your specialisation?',
          'What should every person know about your area but most do not?',
          'What question do you wish people would ask you more often?',
          'Tell me something that changed how you see [your topic]',
        ],
      },
      {
        id: 'challenge', icon: '🚀', title: 'Challenge Me',
        promptTemplates: [
          'Give me a challenge or exercise to grow in [your area]',
          'Quiz me on something important in your domain',
          'What would a master-level practitioner do differently from a beginner?',
          'Give me a thought experiment that expands my thinking',
        ],
      },
    ],
  },
};

// ── Main generator ─────────────────────────────────────────────────────────

/**
 * Generates 4 starter-prompt tabs for a custom persona.
 * All {name} placeholders are replaced with the persona's actual name.
 */
export function generateCustomPersonaPrompts(
  name: string,
  category: string,
): CustomPromptTab[] {
  const seed = CATEGORY_SEEDS[category] ?? CATEGORY_SEEDS['Custom'];
  return seed.tabs.map((tab) => ({
    id: tab.id,
    icon: tab.icon,
    title: tab.title,
    prompts: tab.promptTemplates.map((t) => t.replace(/\{name\}/g, name)),
  }));
}

// ── System prompt validator / compressor ──────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  compressed: string;
  charsBefore: number;
  charsAfter: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Validates and lightly compresses a custom system prompt.
 * - Removes excessive blank lines (>2 in a row)
 * - Trims trailing whitespace per line
 * - Removes duplicate bullet-point rules
 * - Warns if too short, too long, or has no rules/structure
 */
export function validateAndCompressPrompt(raw: string): ValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 1. Normalise line endings + trim per line
  let lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trimEnd());

  // 2. Collapse runs of 3+ blank lines into 2
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankRun++;
      if (blankRun <= 2) collapsed.push(line);
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }
  lines = collapsed;

  // 3. Deduplicate bullet-point rules (case-insensitive, ignoring leading "- ")
  const seen = new Set<string>();
  const deduped: string[] = [];
  let dupeCount = 0;
  for (const line of lines) {
    const key = line.replace(/^[-•*]\s*/, '').trim().toLowerCase();
    if (key && (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*'))) {
      if (seen.has(key)) { dupeCount++; continue; }
      seen.add(key);
    }
    deduped.push(line);
  }
  if (dupeCount > 0) issues.push(`Removed ${dupeCount} duplicate rule${dupeCount > 1 ? 's' : ''}`);

  const compressed = deduped.join('\n').trim();
  const charsBefore = raw.trim().length;
  const charsAfter = compressed.length;

  // 4. Structural checks
  if (charsAfter < 30) {
    issues.push('Instructions are too short — add more detail about personality and behavior');
  }
  if (charsAfter > 4000) {
    issues.push('Instructions exceed 4000 chars — consider trimming to keep AI responses focused');
  }
  if (!/[-•*]\s/.test(compressed)) {
    suggestions.push('Consider adding bullet-point rules (lines starting with -) for clearer behavior');
  }
  if (!compressed.toLowerCase().includes('you are')) {
    suggestions.push('Start with "You are a [role]..." to clearly define the AI\'s identity');
  }

  const valid = charsAfter >= 30;

  return { valid, compressed, charsBefore, charsAfter, issues, suggestions };
}
