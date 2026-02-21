export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = await req.json();

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const result = await model.generateContent(message);
    const response = await result.response;
    
    res.status(200).json({ success: true, reply: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
