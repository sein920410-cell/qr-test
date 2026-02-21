// api/analyze.js
import { Buffer } from 'buffer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: '이미지 경로가 없습니다.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });

  try {
    // 1) 이미지 다운로드
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`이미지 다운로드 실패: ${imgResp.status}`);
    const arrayBuffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');

    // 2) Gemini REST 호출 (모델명 필요시 변경)
    const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
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

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    // 3) 응답 텍스트 안전 추출
    let text = null;
    if (data?.candidates?.[0]?.content?.[0]?.text) text = data.candidates[0].content[0].text;
    else if (data?.output?.[0]?.content) {
      const c = data.output[0].content.find(p => p?.parts?.length);
      if (c) text = c.parts.map(p => p.text || '').join(' ');
    } else if (data?.response?.text) text = data.response.text;
    else text = JSON.stringify(data).slice(0, 1000);

    if (!text) return res.status(500).json({ error: 'AI 응답 파싱 실패', raw: data });

    const items = text.split(',').map(s => s.trim()).filter(Boolean);
    return res.status(200).json({ items, rawText: text, debug: (process.env.NODE_ENV !== 'production') ? data : undefined });

  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: '분석 실패', message: err.message, stack: err.stack });
  }
}v
