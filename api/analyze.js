export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let imageData;
    
    // FormData 또는 JSON 둘 다 지원
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('image');
      if (!file) throw new Error('No image file');
      
      const bytes = await file.arrayBuffer();
      imageData = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
    } else {
      const body = await req.json();
      imageData = body.image;
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `이 사진의 물품을 분석해서 JSON으로:
{"items": [{"name": "사과", "quantity": 3, "category": "과일"}]}`;

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const items = JSON.parse(response.text());

    res.status(200).json({ success: true, items: items.items || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
