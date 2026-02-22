import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: "파일 경로 누락" });

  try {
    // 1. 보안 주소 생성
    const { data: signedData, error: signErr } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 120);
    if (signErr) throw signErr;

    // 2. 이미지 가져오기
    const imgResp = await fetch(signedData.signedUrl);
    const b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");

    // 3. Gemini AI 분석 (inline_data -> inlineData 로 수정)
    // 모델명이 비어있을 경우를 대비해 기본값을 넣었습니다.
    const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; 
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: b64 } }, // 여기 대문자 D로 수정!
          { text: "이 사진에서 식별 가능한 모든 물건들의 이름만 한국어로 콤마(,)로 구분해서 리스트업해줘. 불필요한 설명은 절대 하지마." }
        ]}]
      })
    });

    const gData = await gResp.json();
    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = rawText.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
