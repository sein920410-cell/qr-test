export default async function handler(req, res) {
  // 기존 코드...
}

// api/chat.js
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

if (!SUPA_URL || !SUPA_SERVICE || !GEMINI_KEY) {
  console.error("Missing env vars for chat function");
}

const supa = createClient(SUPA_URL, SUPA_SERVICE);

function sanitizeText(t) {
  if (!t) return "";
  return String(t).slice(0, 1500);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { message, inventory, tag } = req.body || {};
  const userMsg = sanitizeText(message);
  const tagVal = tag ? String(tag).slice(0, 50) : "DRAWER001";

  if (!userMsg) return res.status(400).json({ error: "Empty message" });

  try {
    // 1) (선택) 서버에서 bot 답변을 직접 생성 — 여기선 Gemini REST 사용
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const prompt = `당신은 비서 '결'입니다. 보관함 태그: ${tagVal}. 물품목록: ${inventory || ""}. 사용자의 질문: ${userMsg}. 짧고 친절하게 한국어로 응답하세요.`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const gData = await gResp.json();
    let botReply = "";
    if (gData?.candidates?.[0]?.content?.[0]?.text) botReply = gData.candidates[0].content[0].text;
    else if (gData?.response?.text) botReply = gData.response.text;
    else botReply = JSON.stringify(gData).slice(0, 1000);
    botReply = botReply.slice(0, 2000);

    // 2) DB에 bot 메시지 삽입 (service_role 사용)
    const { error: insErr } = await supa.from("chat_messages").insert([{
      tag: tagVal,
      sender: "bot",
      content: botReply
    }]);

    if (insErr) {
      console.error("DB insert error", insErr);
      return res.status(500).json({ error: "DB insert failed" });
    }

    return res.status(200).json({ reply: botReply });
  } catch (err) {
    console.error("chat handler error", err);
    return res.status(500).json({ error: err.message || "chat failed" });
  }
}
