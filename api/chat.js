import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { message, inventory, tag } = req.body || {};

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const prompt = `당신은 비서 '결'입니다. 태그: ${tag}. 물품: ${inventory}. 질문: ${message}. 친절하게 한국어로 응답하세요.`;
    
    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await gResp.json();
    const botReply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "이해하지 못했어요.";

    await supa.from("chat_messages").insert([{ tag, sender: "bot", content: botReply }]);
    return res.status(200).json({ reply: botReply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
