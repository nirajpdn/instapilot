import OpenAI from "openai";

import { env } from "@/lib/env";

let client: OpenAI | null = null;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

function fallbackComment(excludedComments: string[]) {
  const candidates = [
    "Love the vibe here",
    "This looks really good",
    "Clean shot, nicely done",
    "Great post, well done",
    "Really like this one",
    "Nice work on this post",
    "This turned out great",
    "Looks awesome, great share",
    "Such a solid post",
    "Really cool update",
  ];

  const used = new Set(excludedComments.map((c) => c.trim().toLowerCase()));
  const available = candidates.filter((c) => !used.has(c.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Nice post ${Math.floor(Math.random() * 900 + 100)}`;
}

export async function generateUniqueComment(params: {
  postUrl: string;
  excludedComments: string[];
}) {
  const openai = getClient();
  console.log("Generating Comment...");
  if (!openai) {
    return fallbackComment(params.excludedComments);
  }
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Generate one short, natural Instagram comment for a public post. Keep it under 18 words. Avoid hashtags and emojis unless natural.",
        },
        {
          role: "user",
          content: `Post URL: ${params.postUrl}\nAvoid duplicates of: ${params.excludedComments.join(" | ") || "None"}`,
        },
      ],
    });

    const text = response.output_text.trim();
    if (!text) {
      return fallbackComment(params.excludedComments);
    }
    return text;
  } catch {
    return fallbackComment(params.excludedComments);
  }
}
