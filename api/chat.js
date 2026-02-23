import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
// 1.5 Flash로 기본 모델 설정 [cite: 2026-02-20]
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  
  const { message, inventory, tag } = req.body || {};

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    
    // 비서 '결'의 정체성을 강화한 프롬프트입니다 [cite: 2026-02-20]
    const prompt = `
      당신은 스마트 보관 관리 시스템 '공간:결'의 비서 '결'입니다. [cite: 2026-02-07]
      태그(서랍이름): ${tag}
      현재 보관된 물품 목록: ${inventory}
      사용자 질문: ${message}
      
      지시사항:
      1. 질문에 대해 서랍 속을 훤히 꿰뚫어 보는 비서처럼 친절하게 한국어로 답하세요.
      2. 물건의 위치나 특징을 언급하며 사용자에게 도움을 주세요.
      3. 전문적인 용어보다는 이해하기 쉬운 표현을 사용하세요. [cite: 2026-02-18]
    `;
    
    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await gResp.json();

    // 에러 발생 시 상세 이유를 로그에 남깁니다 [cite: 2026-01-11]
    if (gData.error) {
      console.error("Gemini API 에러:", gData.error.message);
      return res.status(500).json({ error: "비서 결이 분석 중 잠시 길을 잃었어요. 다시 시도해 주세요." });
    }

    const botReply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "죄송해요, 서랍 속을 확인하지 못했어요.";

    // Supabase에 대화 내용 저장 [cite: 2026-02-20]
    await supa.from("chat_messages").insert([{ tag, sender: "bot", content: botReply }]);
    
    return res.status(200).json({ reply: botReply });
  } catch (err) {
    console.error("서버 내부 오류:", err.message);
    return res.status(500).json({ error: "시스템 연결에 문제가 발생했습니다." });
  }
}
