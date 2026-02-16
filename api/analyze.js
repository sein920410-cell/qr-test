module.exports = async (req, res) => {
  try {
    const { image } = req.body;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "이 사진 속 물건들을 쉼표로 구분해서 목록만 알려줘." },
          { inline_data: { mime_type: "image/jpeg", data: image } }
        ]}]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }
    const result = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
