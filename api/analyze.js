export default async function handler(req, res) {
  // 기존 코드...
}

// api/analyze.js
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const BUCKET = process.env.SUPABASE_BUCKET || "user_uploads";

if (!SUPA_URL || !SUPA_SERVICE || !GEMINI_KEY) {
  console.error("Missing env vars for analyze function");
}

const supa = createClient(SUPA_URL, SUPA_SERVICE);

function validFilePath(p) {
  // 허용되는 파일경로 패턴: 영숫자, -, _, /, ., 최대길이 제한
  return typeof p === "string" && /^[A-Za-z0-9_\-./]{1,300}$/.test(p);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body || {};

  if (!filePath || !validFilePath(filePath)) {
    return res.status(400).json({ error: "Invalid filePath" });
  }
  if (!SUPA_URL || !SUPA_SERVICE || !GEMINI_KEY) {
    return res.status(500).json({ error: "Server env not configured" });
  }

  try {
    // 1) signed url 생성 (짧게: 60초)
    const { data: signedData, error: signErr } = await supa.storage.from(BUCKET).createSignedUrl(filePath, 60);
    if (signErr || !signedData?.signedUrl) throw signErr || new Error("signed url failed");
    const signedUrl = signedData.signedUrl;

    // 2) 이미지 다운로드
    const imgResp = await fetch(signedUrl);
    if (!imgResp.ok) throw new Error(`image download failed ${imgResp.status}`);
    const arr = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arr).toString("base64");

    // 3) Gemini REST 호출 (API key in header)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: b64 } },
            { text: "이 이미지에 보이는 물품의 이름만 콤마(,)로 구분하여 한국어로 출력하세요. 설명 금지." }
          ]
        }
      ]
    };

    const gResp = await fetch(`${endpoint}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // optional: timeout handling can be added in production
    });

    const gData = await gResp.json();

    // 4) 텍스트 추출 (여러 포맷 대응)
    let text = null;
    if (gData?.candidates?.[0]?.content?.[0]?.text) text = gData.candidates[0].content[0].text;
    else if (gData?.response?.text) text = gData.response.text;
    else if (typeof gData === "string") text = gData;
    else text = JSON.stringify(gData).slice(0, 2000);

    const items = text.split(",").map(s => s.trim()).filter(Boolean);
    return res.status(200).json({ items, raw: text });
  } catch (err) {
    console.error("analyze error:", err);
    return res.status(500).json({ error: err.message || "analyze failed", raw: (err.stack || "") });
  }
}
