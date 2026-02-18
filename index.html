module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { image } = req.body;
  
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "이 사진 속의 모든 물건을 아주 자세하게 찾아내서 쉼표로 구분한 목록으로 알려줘. 눈에 보이는 작은 파우치나 바구니, 세정제 병들도 모두 포함해줘." },
          { inline_data: { mime_type: "image/jpeg", data: image } }
        ]}]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates || !data.candidates[0]) return res.status(500).json({ error: "분석 결과가 없습니다." });
    
    const result = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
