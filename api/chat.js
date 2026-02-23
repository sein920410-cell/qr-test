import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash"; // 한도 걱정 없는 1.5 Flash [cite: 2026-02-20]

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { message, inventory, tag } = req.body || {};

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const prompt = `
      당신은 스마트 보관 관리 시스템 '공간:결'의 비서 '결'입니다. [cite: 2026-02-07]
      태그: ${tag}. 물품목록: ${inventory}. 
      사용자 질문: ${message}
      비서처럼 친절하게 한국어로 응답하세요. 전문 용어보다는 쉽게 설명해 주세요. [cite: 2026-02-18]
    `;
    
    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await gResp.json();
    const botReply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "죄송해요, 서랍 확인에 실패했어요.";

    // Supabase 대화 기록 저장
    await supa.from("chat_messages").insert([{ tag, sender: "bot", content: botReply }]);
    
    return res.status(200).json({ reply: botReply });
  } catch (err) {
    return res.status(500).json({ error: "시스템 오류가 발생했습니다." });
  }
}
