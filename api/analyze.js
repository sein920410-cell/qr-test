// api/analyze.js
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const BUCKET = process.env.SUPABASE_BUCKET || 'user_uploads';

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  if (!SUPA_URL || !SUPA_SERVICE || !GEMINI_KEY) {
    return res.status(500).json({ error: '서버 환경변수 미설정' });
  }

  try {
    // 1) Signed URL 생성 (60초)
    const { data: signedData, error: signErr } = await supa.storage.from(BUCKET).createSignedUrl(filePath, 60);
    if (signErr || !signedData?.signedUrl) throw signErr || new Error('signed url 생성 실패');
    const signedUrl = signedData.signedUrl;

    // 2) 이미지 다운로드 -> base64
    const imgResp = await fetch(signedUrl);
    if (!imgResp.ok) throw new Error(`이미지 다운로드 실패 ${imgResp.status}`);
    const arr = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arr).toString('base64');

    // 3) Gemini 호출 (REST)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: b64 } },
            { text: "이 이미지에 보이는 물품의 이름만 콤마(,)로 구분하여 한국어로 출력하세요. 설명 금지." }
          ]
        }
      ]
    };

    const gResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify(body)
    });

    const gData = await gResp.json();

    // 4) 응답 텍스트 안전 추출
    let text = null;
    if (gData?.candidates?.[0]?.content?.[0]?.text) text = gData.candidates[0].content[0].text;
    else if (gData?.response?.text) text = gData.response.text;
    else if (typeof gData === 'string') text = gData;
    else text = JSON.stringify(gData).slice(0, 2000);

    const items = text.split(',').map(s => s.trim()).filter(Boolean);
    return res.status(200).json({ items, raw: text });
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: err.message || 'analyze failed', raw: (err.stack || '') });
  }
}
