import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

// Supabase 설정
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;

  try {
    // 1. Supabase Storage에서 이미지 가져오기
    const { data: signedData } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 60);
    const imgResp = await fetch(signedData.signedUrl);
    const b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");

    // 2. Gemini API 설정
    const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelName = rawModel.includes('/') ? rawModel.split('/').pop() : rawModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // 3. AI 분석 요청 (프롬프트 강화 버전)
    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: "image/jpeg", data: b64 } },
          { text: `
            이미지 속 물건들을 하나하나 아주 구체적으로 분석해줘.
            1. 브랜드명과 정확한 제품명을 포함할 것 (예: '베베앙 아기물티슈 핑크', '로지텍 M331 마우스')
            2. 비슷한 물건이 여러 개 있다면 겉면에 적힌 고유한 문구나 색상으로 반드시 구분할 것.
            3. 결과는 오직 한국어 물품 이름들만 콤마(,)로 구분해서 출력하고, 다른 설명은 절대 하지 마.
          ` }
        ]}]
      })
    });

    const gData = await gResp.json();
    if (gData.error) return res.status(200).json({ items: [], error: gData.error.message });

    // 4. 결과 처리
    const botText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // 콤마로 구분된 텍스트를 배열로 변환
    const items = botText.split(",").map(s => s.trim()).filter(it => it);
    
    return res.status(200).json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "서버 오류 발생" });
  }
}
