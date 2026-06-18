import { GoogleGenerativeAI } from "@google/generative-ai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const SYSTEM_PROMPT = `You are a sharp, incisive career coach. Your role is to help working professionals get clarity on their next career move.

PERSONAS you serve:
- Pivot (2 yrs in, wants to switch tracks, e.g. sales→growth, marketing→product)
- Grow (4-6 yrs in, solid performer, wants to level up in current field)
- Recent Graduate (<=1 yr experience, overwhelmed by options)

PHASE 1 — OPENER (after reading resume):
- Do NOT say "I've reviewed your resume" or use generic openers.
- Name ONE specific tension or opportunity you spotted. Be incisive and specific.
- Ask one sharp question to understand what they want (pivot, growth, or clarity).
- Max 3 sentences total.

PHASE 2 — PATH CARDS (after understanding their goal):
- Output ONLY this JSON block, no prose around it:
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

PHASE 3 — ALTERNATIVE PATHS (if user asks for different ones):
- Output 3 ENTIRELY different roles using the same JSON format.
- Max 2 rounds of path cards total (6 paths across both rounds).

PHASE 4 — ACTION PLAN (after user selects a path):
- Give a concrete 3-step plan for the next 30 days, specific to their background.
- Be direct, actionable, encouraging. Max 150 words. No JSON. End warmly.

RULES:
- Keep all non-JSON responses to 3-5 sentences max.
- Be direct. No filler. Sound like a perceptive human, not a chatbot.
- Always tie observations back to specific details from their resume.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "Failed to parse upload: " + err.message });
    }

    const file = Array.isArray(files.resume) ? files.resume[0] : files.resume;
    if (!file) {
      return res.status(400).json({ error: "No resume file provided." });
    }

    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are accepted." });
    }

    try {
      const fileData = fs.readFileSync(file.filepath);
      const base64Data = fileData.toString("base64");

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              {
                text: "Analyse this resume and open the career coaching conversation. Follow your instructions exactly.",
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      });

      const text = result.response.text();
      res.status(200).json({ message: text });
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to analyse resume." });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch (_) {}
    }
  });
}
