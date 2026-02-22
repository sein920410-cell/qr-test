// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, tag } = req.body;
    console.log('💬 Chat:', { message, tag });

    // 간단 로직 (나중 Supabase 연동)
    const reply = message.includes('쫀디기') ? '쫀디기 2개 남았어요! DRAWER001 서랍에 있어요 📦' :
                 message.includes('몇 개') ? '현재 보관 중인 물품: 쫀디기(2), 맥심(20), 종이컵(50)' :
                 '물품 이름을 말씀해주세요. 예: "쫀디기" 또는 "커피믹스"';

    res.status(200).json({ reply, success: true });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
}
