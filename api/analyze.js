export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Method not POST:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // FormData에서 이미지 추출
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const tag = formData.get('tag') || 'DRAWER001';

    if (!imageFile) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다', success: false });
    }

    console.log('📸 Analyze 시작:', { tag, filename: imageFile.name });

    // 이미지 base64 변환
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // 제미나이 API 호출
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `이 서랍 사진에서 물건들의 이름, 카테고리, 개수를 추출해줘.
형식: 정확히 JSON 배열로만 응답. 
예: [{"name":"쫀디기","category":"식품","quantity":2}]
카테고리 예시: 식품,주방,화장품,의약품,문구,전자제품,기타`
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }]
        })
      }
    );

    const data = await apiResponse.json();
    console.log('🤖 Gemini 응답:', data);

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Gemini API 오류');
    }

    // JSON 파싱 (안전 처리)
    let items = [];
    try {
      const content = data.candidates[0].content.parts[0].text;
      items = JSON.parse(content);
      if (!Array.isArray(items)) items = [];
    } catch (parseErr) {
      console.error('JSON 파싱 실패:', parseErr);
      items = [];
    }

    res.status(200).json({
      success: true,
      items: items.map(i => ({
        cat: i.category || '기타',
        n: i.name || '알 수 없음',
        q: parseInt(i.quantity) || 1
      })),
      tag,
      analyzed: items.length
    });

  } catch (error) {
    console.error('💥 Analyze 오류:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
}
