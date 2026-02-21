// api/analyze.js (서버에서 실행 — Vercel)
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { filePath } = req.body;
  if(!filePath) return res.status(400).json({ error: 'filePath required' });

  try {
    // 서명 URL 생성(서비스 키 필요)
    const { data: sdata, error: signErr } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 60);
    if (signErr || !sdata?.signedUrl) throw signErr || new Error('signed url failed');
    const signedUrl = sdata.signedUrl;

    // 이미지 다운로드, base64 변환
    const imgResp = await fetch(signedUrl);
    if (!imgResp.ok) throw new Error('이미지 다운로드 실패');
    const arr = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arr).toString('base64');

    // Gemini 호출 (환경변수 GEMINI_API_KEY, GEMINI_MODEL)
    const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: b64 } },
            { text: "이 이미지에 보이는 물품 이름만 콤마(,)로 구분하여 한국어로 출력하세요. 설명 금지." }
          ]
        }
      ]
    };

    const gResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body)
    });

    const gData = await gResp.json();
    // 안정적 파싱(예시)
    let text = gData?.candidates?.[0]?.content?.[0]?.text || gData?.response?.text || JSON.stringify(gData).slice(0,1000);
    const items = text.split(',').map(s => s.trim()).filter(Boolean);

    return res.status(200).json({ items, raw: text });
  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: err.message || 'analyze failed' });
  }
}
