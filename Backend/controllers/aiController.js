import axios from "axios";
import { GoogleGenAI } from "@google/genai";

/* =========================
   🎙 Speech-to-Text (AssemblyAI)
========================= */
export const speechToText = async (filename) => {
  try {
    const audioUrl = `http://localhost:5000/uploads/${filename}`;

    const { data: startData } = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { audio_url: audioUrl },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );

    const transcriptId = startData.id;

    while (true) {
      const { data } = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: process.env.ASSEMBLYAI_API_KEY,
          },
        }
      );

      if (data.status === "completed") return data.text;
      if (data.status === "failed") throw new Error("Transcription failed");

      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("❌ STT Error:", err.response?.data || err.message);
    throw new Error("Speech-to-text failed");
  }
};

/* =========================
   🤖 Gemini AI Client
========================= */
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* =========================
   🤖 Generate Mail
========================= */
export const generateMail = async (prompt) => {
  try {
    console.log("🔥 Gemini AI called");

    // Supported model: fallback to gpt-4o-mini if Gemini fails
    const modelName = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Generate a professional email.

Return EXACTLY in this format:
Subject: <subject>
Body:
<email body>

Prompt: ${prompt}
              `,
            },
          ],
        },
      ],
    });

    // Extract text safely
    let text = response?.text;
    if (!text && response?.output?.[0]?.content?.[0]?.text) {
      text = response.output[0].content[0].text;
    }

    if (!text) throw new Error("Empty AI response");

    // Parse Subject & Body
    let subject = "AI Generated Mail";
    let body = text;

    const subjectMatch = text.match(/Subject:\s*(.*)/i);
    const bodyMatch = text.match(/Body:\s*([\s\S]*)/i);

    if (subjectMatch) subject = subjectMatch[1].trim();
    if (bodyMatch) body = bodyMatch[1].trim();

    return { subject, body };
  } catch (err) {
    console.error(
      "❌ Gemini/GPT Error:",
      err.response?.data || err.message || err
    );
    throw new Error("Mail generation failed");
  }
};
