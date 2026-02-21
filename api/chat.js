// api/chat.js (replace)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Method Not Allowed' });

  const { message, inventory } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ reply: '서버 API KEY 미설정' });

  try {
    const promptText = `당신은 비서 '결'입니다. 현재 보관함 물품 목록: ${inventory || '[]'}. 사용자의 질문: ${message}. 친구처럼 친절하게, 핵심만 답해주세요.`;

    const body = {
      contents: [
        { parts: [{ text: promptText }] }
      ]
    };

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    // 안전하게 텍스트 추출 (여러 포맷 대비)
    let reply = '';
    if (data?.candidates?.[0]?.content?.[0]?.text) reply = data.candidates[0].content[0].text;
    else if (data?.output?.[0]?.content) {
      const p = data.output[0].content.find(x => x.parts && x.parts.length);
      reply = p ? p.parts.map(pp => pp.text || '').join(' ') : '';
    } else if (data?.response?.text) reply = data.response.text;
    else reply = JSON.stringify(data).slice(0, 200); // debug fallback

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('chat error:', err);
    return res.status(500).json({ reply: '결이가 답변을 준비하지 못했습니다: ' + err.message });
  }
}
