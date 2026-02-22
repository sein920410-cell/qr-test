import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const BUCKET = "user_uploads";

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body || {};

  if (!filePath) return res.status(400).json({ error: "파일 경로가 없습니다." });

  try {
    const { data: signedData, error: signErr } = await supa.storage.from(BUCKET).createSignedUrl(filePath, 60);
    if (signErr || !signedData?.signedUrl) throw signErr || new Error("주소 생성 실패");

    const imgResp = await fetch(signedData.signedUrl);
    const arr = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arr).toString("base64");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: b64 } },
          { text: "이 이미지에 보이는 물품의 이름만 콤마(,)로 구분하여 한국어로 출력하세요. 설명은 빼주세요." }
        ]
      }]
    };

    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const gData = await gResp.json();
    const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = text.split(",").map(s => s.trim()).filter(Boolean);
    
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
