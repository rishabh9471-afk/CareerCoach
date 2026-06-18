import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a sharp, incisive career coach. Continue the career coaching conversation based on the resume already analysed.

CONVERSATION PHASES:

PHASE 2 — PATH CARDS (after understanding their goal):
Output ONLY this JSON block, no prose around it:
<<<PATHS_JSON>>>
{
  "intro": "One sentence framing why these three paths make sense for them.",
  "paths": [
    {
      "title": "Role Title",
      "fit": "High fit",
      "description": "2 sentences: why this fits their specific background.",
      "tags": ["Transferable skill", "Required skill", "Growth area"]
    },
    {
      "title": "Role Title",
      "fit": "Strong fit",
      "description": "2 sentences specific to them.",
      "tags": ["Skill 1", "Skill 2", "Skill 3"]
    },
    {
      "title": "Role Title",
      "fit": "Worth exploring",
      "description": "2 sentences specific to them.",
      "tags": ["Skill 1", "Skill 2"]
    }
  ]
}
<<<END_PATHS_JSON>>>

PHASE 3 — ALTERNATIVE PATHS (if user asks for different paths):
Output a new set of 3 ENTIRELY different roles — different functions, industries, risk profiles.
Use the same JSON format. Max 2 rounds total.

PHASE 4 — ACTION PLAN (after user selects a path):
Give a concrete 3-step plan for the next 30 days, specific to their background.
Be direct, actionable, encouraging. Max 150 words. No JSON. End the session warmly.

RULES:
- Keep all non-JSON responses to 3-5 sentences max.
- Be direct. No filler. Sound like a perceptive human.
- Tie all advice to specific details from their background.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { history, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const geminiHistory = (history || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
    });

    // Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const streamResult = await chat.sendMessageStream(message);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
