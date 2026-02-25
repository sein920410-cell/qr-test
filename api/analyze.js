import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;

  try {
    const { data: sData, error: sErr } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 120);
    if (sErr || !sData) throw new Error("이미지 주소 생성 실패");

    const imgResp = await fetch(sData.signedUrl);
    const buffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(buffer).toString("base64");

    const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: b64 } },
          { text: "정리 전문가 '결'로서 사진 속 물건들을 아주 꼼꼼하게 다 찾아내. 결과는 반드시 [물건1, 물건2, 물건3] 처럼 콤마로만 구분해서 보내고 다른 말은 절대 하지 마." }
        ]}]
      })
    });

    const gData = await gResp.json();
    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = rawText.split(/[,\n]/).map(s => s.trim().replace(/[\[\]\.]/g, "")).filter(s => s.length > 0);
    
    return res.status(200).json({ items: items.length > 0 ? items : ["확인 필요 물품"] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
