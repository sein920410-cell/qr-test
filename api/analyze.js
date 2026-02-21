export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: '이미지 경로가 없습니다.' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: '서버 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    // 1) 이미지 fetch
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`이미지 다운로드 실패: ${imgResp.status} ${imgResp.statusText}`);
    const arrayBuffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');

    // 2) REST 요청 바디 (inline image + prompt)
    const body = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: b64 } }, // mime_type은 실제에 맞게 조정 (image/png 등)
            { text: "이 이미지에 보이는 물품의 이름만 콤마(,)로 구분하여 한국어로 출력하세요. 항목 외 설명 금지." }
          ]
        }
      ]
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    // 안전하게 응답 텍스트 추출 (REST 응답 포맷은 variants 있음)
    let text = null;
    if (data && data.candidates && data.candidates.length) {
      // older/alternate
      text = (data.candidates[0].content && data.candidates[0].content[0] && data.candidates[0].content[0].text) || null;
    }
    // new style: data.output or data.response?.text 혹은 top-level 대체
    if (!text && data?.output?.[0]?.content) {
      // try find text inside
      const c = data.output[0].content.find(p => p?.parts?.length);
      if (c) text = c.parts.map(p => p.text || '').join(' ');
    }
    // fallback: 전체 JSON stringify (디버그용)
    if (!text && data?.candidates) {
      text = JSON.stringify(data.candidates);
    }
    if (!text && data?.response) {
      text = data.response?.text || JSON.stringify(data);
    }

    // 최종 안전 처리
    if (!text) return res.status(500).json({ error: 'AI 응답을 파싱하지 못했습니다.', raw: data });

    // items: "사과,바나나,..." 형태 가정 -> 배열로 변환
    const items = text.split(',').map(s => s.trim()).filter(Boolean);

    return res.status(200).json({ items, rawText: text, debug: data });

  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: '분석 실패', message: err.message, stack: err.stack });
  }
}
