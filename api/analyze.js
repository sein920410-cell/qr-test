import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Vercel 환경 변수에서 정보를 가져옵니다. 반드시 대시보드에 등록되어 있어야 합니다!
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;

  try {
    // 1. Supabase에서 주소를 가져올 때 데이터 유무를 엄격히 체크합니다.
    const { data: s, error: sErr } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 120);
    if (sErr || !s || !s.signedUrl) {
      console.error("Supabase 주소 생성 실패:", sErr);
      return res.status(500).json({ error: "이미지 주소를 가져오지 못했습니다." });
    }

    // 2. 이미지를 Base64로 변환하여 Gemini에게 전달합니다.
    const imgResp = await fetch(s.signedUrl);
    const buffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(buffer).toString("base64");

    const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: b64 } },
          { text: "당신은 정리 전문가 비서 '결'입니다. 사진 속 물건들을 [물품명(특징)] 형태로 콤마(,)로만 구분해서 리스트업하세요. 인사말 없이 결과만 나열해." }
        ]}]
      })
    });

    const gData = await gResp.json();
    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = rawText.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    return res.status(200).json({ items });
  } catch (err) {
    console.error("서버 내부 오류:", err);
    return res.status(500).json({ error: err.message });
  }
}
