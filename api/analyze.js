import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;

  try {
    const { data: signedData } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 60);
    const imgResp = await fetch(signedData.signedUrl);
    const b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: "image/jpeg", data: b64 } },
          { text: `
            이미지 속의 모든 물건을 아주 세밀하게 분석해서 리스트를 만들어줘.
            1. 브랜드명(예: 베베앙, 로지텍)과 구체적인 제품명(예: 아기물티슈 핑크, 사일런트 마우스)을 반드시 포함할 것. 
            2. 포장지에 적힌 텍스트를 최우선으로 읽어서 제품을 구분해. 단순히 '물티슈'라고만 하지 말고 상세 정보를 붙여.
            3. 결과는 오직 한국어 물품 이름들만 콤마(,)로 구분해서 출력하고, 다른 군더더기 설명은 일절 금지한다.
          ` }
        ]}]
      })
    });

    const gData = await gResp.json();
    const botText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = botText.split(",").map(s => s.trim()).filter(it => it);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류 발생" });
  }
}
