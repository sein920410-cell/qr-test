export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 기존 제미나이 코드 그대로
    const result = await analyzeImage(req.body.image);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
