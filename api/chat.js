// api/chat.js
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Method Not Allowed' });

  const { message, inventory, tag } = req.body;
  if (!message) return res.status(400).json({ reply: 'message required' });

  try {
    // 1) 간단히 사용자 메시지를 DB에 남김 (so other clients see user msg)
    if (tag) {
      await supa.from('chat_messages').insert([{ tag, sender: 'user', content: message }]);
    }

    // 2) Gemini 프롬프트 조합
    const prompt = `당신은 비서 '결'입니다. 현재 물품 목록: ${inventory || '[]'}. 사용자 질문: ${message}. 간결하게 한국어로 답변하세요.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const gResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify(body)
    });

    const gData = await gResp.json();

    let reply = '';
    if (gData?.candidates?.[0]?.content?.[0]?.text) reply = gData.candidates[0].content[0].text;
    else if (gData?.response?.text) reply = gData.response.text;
    else reply = '결이가 답변을 준비하지 못했습니다.';

    // 3) Supabase에 bot 메시지 저장 (클라이언트가 구독으로 받음)
    if (tag) {
      await supa.from('chat_messages').insert([{ tag, sender: 'bot', content: reply }]);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ reply: '결이가 응답을 준비하지 못했습니다: ' + (err.message || '') });
  }
}
