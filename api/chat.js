export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, tag = 'DRAWER001' } = req.body;
    
    // localStorage 시뮬레이션 (나중 Supabase로 교체)
    const getItems = () => {
      // Vercel에서는 localStorage 없음 → 임시 데이터 또는 DB
      return []; // 실제로는 Supabase에서 불러오기
    };

    const items = getItems();
    const msgLower = message.toLowerCase();

    let reply = '현재 보관 중인 물품을 말씀해주세요!';

    // 물품 검색
    const found = items.filter(item => 
      item.n.toLowerCase().includes(msgLower)
    );

    if (found.length > 0) {
      reply = `${found[0].n} ${found[0].q}개 있습니다!\n`;
      reply += `📍 위치: ${tag}\n`;
      if (found.length > 1) reply += `다른 ${found.length-1}개도 있습니다.`;
    } else if (msgLower.includes('몇 개') || msgLower.includes('재고')) {
      reply = `총 ${items.length}개 물품 보관 중입니다.\n구체적인 물품 이름을 말씀해주세요!`;
    }

    // Supabase 실시간 준비 (주석)
    /*
    const { data: realtimeItems } = await supabase
      .from('inventory')
      .select('*')
      .eq('drawer_tag', tag)
      .order('created_at', { ascending: false });
    */

    res.status(200).json({ 
      reply, 
      success: true,
      foundCount: found.length 
    });

  } catch (error) {
    console.error('Chat 오류:', error);
    res.status(500).json({ error: error.message });
  }
}
