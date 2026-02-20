module.exports = async (req, res) => {
  const { image, mimeType } = req.body;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "사진 속 물건들을 하나하나 쉼표로 구분해서 이름만 알려줘." },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
        ]}]
      })
    });
    const data = await response.json();
    res.status(200).json({ result: data.candidates[0].content.parts[0].text });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
