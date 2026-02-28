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

    const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelName = rawModel.includes('/') ? rawModel.split('/').pop() : rawModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: "image/jpeg", data: b64 } },
          { text: "이미지의 물품 이름만 콤마(,)로 구분해 한국어로 출력해. 설명 금지." }
        ]}]
      })
    });

    const gData = await gResp.json();
    if (gData.error) return res.status(200).json({ items: [], error: gData.error.message });

    const botText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = botText.split(",").map(s => s.trim()).filter(it => it);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: "서버 오류 발생" });
  }
}
