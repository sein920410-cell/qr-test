export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image');
    
    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });

    const prompt = `이 사진에서 물품들을 찾아서 JSON으로 정리해줘:
{
  "items": [
    {
      "name": "물품명",
      "quantity": 1,
      "category": "카테고리"
    }
  ]
}`;

    const result = await model.generateContent([prompt, base64]);
    const response = await result.response;
    const text = response.text();

    const items = JSON.parse(text);
    res.status(200).json({ success: true, items: items.items || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
