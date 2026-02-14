/**
 * Wizard prompt configuration for Musical Eras feature
 *
 * Defines the questions users answer to build their timeline.
 */

import type { EraPrompt, EraPromptId } from "@/types/eras";

export const ERA_PROMPTS: EraPrompt[] = [
  {
    id: "first_album",
    label: "First Album",
    question: "What's the first album you remember listening to?",
    description: "The earliest musical memory that stuck with you",
    allowMultiple: false,
    allowSkip: true,
  },
  {
    id: "first_adored",
    label: "First Adored",
    question: "What's the first album you truly adored?",
    description: "When music went from background to something special",
    allowMultiple: false,
    allowSkip: true,
  },
  {
    id: "teenage_years_1",
    label: "Teenage Years",
    question: "What albums defined your teenage years?",
    description: "Pick up to 3 albums that shaped your formative years",
    allowMultiple: true, // Up to 3
    allowSkip: true,
  },
  {
    id: "taste_shift",
    label: "Taste Shift",
    question: "What album changed your taste forever?",
    description: "The album that opened a new door or shifted your direction",
    allowMultiple: false,
    allowSkip: true,
  },
  {
    id: "always_return",
    label: "Always Return",
    question: "What album can you always go back to?",
    description: "Your reliable comfort album that never gets old",
    allowMultiple: false,
    allowSkip: true,
  },
  {
    id: "recent_love",
    label: "Recent Love",
    question: "What's the most recent album you loved?",
    description: "Something that caught your ear recently",
    allowMultiple: false,
    allowSkip: true,
  },
  {
    id: "forever_album",
    label: "Forever Album",
    question: "If forced to choose, what's your one forever album?",
    description: "The impossible question - if you could only keep one",
    allowMultiple: false,
    allowSkip: false, // Final step, shouldn't skip
  },
];

/**
 * Get prompt configuration by ID
 */
export function getPromptById(id: EraPromptId): EraPrompt | undefined {
  return ERA_PROMPTS.find((p) => p.id === id);
}

/**
 * Get display label for a prompt ID
 */
export function getPromptLabel(id: EraPromptId): string {
  const prompt = getPromptById(id);
  return prompt?.label ?? id;
}
