import OpenAI from "openai";

import { env } from "@/lib/env";

let client: OpenAI | null = null;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export async function generateUniqueComment(params: {
  postUrl: string;
  excludedComments: string[];
}) {
  const openai = getClient();
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
    throw new Error("LLM returned empty comment");
  }
  return text;
}
