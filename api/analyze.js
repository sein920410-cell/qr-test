export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    
    // 제미나이 API 호출 (당신의 기존 환경변수 사용)
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `이 이미지에서 QR코드와 물품을 분석해줘. JSON 형식으로:
{
  "items": [
    {
      "name": "물품명",
      "quantity": 1,
      "qrCode": "QR값" 
    }
  ]
}`;

    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ success: true, items: JSON.parse(text) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
