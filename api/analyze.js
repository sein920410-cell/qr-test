// api/analyze.js
module.exports = async (req, res) => {
  // POST 방식이 아니면 거절 (보안 강화)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "이 사진 속에 있는 물건들을 다 찾아서 쉼표로 구분해서 목록만 알려줘." },
            { inline_data: { mime_type: "image/jpeg", data: image } }
          ]
        }]
      })
    });

    const data = await response.json();

    // 구글에서 에러가 왔을 경우 처리
    if (!data.candidates || !data.candidates[0]) {
      console.error("Google API Error:", data);
      return res.status(500).json({ error: "구글 분석기 응답 실패" });
    }

    const result = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "서버 연결 오류" });
  }
};
