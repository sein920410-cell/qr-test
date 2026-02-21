// api/chat.js
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supa = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Method Not Allowed' });

  const { message, inventory, tag } = req.body;
  if (!message) return res.status(400).json({ reply: 'message required' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ reply: 'GEMINI_API_KEY 미설정' });

  try {
    const promptText = `당신은 비서 '결'입니다. 현재 보관함 물품 목록: ${inventory || '[]'}. 사용자의 질문: ${message}. 친절하고 간결하게 답해주세요.`;

    const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = { contents: [{ parts: [{ text: promptText }] }] };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    // 안정적 텍스트 추출
    let reply = '';
    if (data?.candidates?.[0]?.content?.[0]?.text) reply = data.candidates[0].content[0].text;
    else if (data?.output?.[0]?.content) {
      const p = data.output[0].content.find(x => x.parts && x.parts.length);
      reply = p ? p.parts.map(pp => pp.text || '').join(' ') : '';
    } else if (data?.response?.text) reply = data.response.text;
    else reply = '결이가 답변을 준비하지 못했습니다.';

    // Supabase에 bot 메시지 저장 (chat_messages 테이블)
    if (supa && tag) {
      await supa.from('chat_messages').insert([{ tag, sender: 'bot', content: reply }]);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ reply: '결이가 답을 준비하지 못했습니다: ' + err.message });
  }
}
