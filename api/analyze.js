export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 여기에 당신의 기존 제미나이 분석 코드 넣기
    const result = { message: 'API 작동 중!' }; // 테스트용
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
