module.exports = async (req, res) => {
  const { message, inventory } = req.body;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `당신은 비서 '결'입니다. 인벤토리: ${inventory}. 질문: ${message}` }] }]
      })
    });
    const data = await response.json();
    res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
  } catch (err) { res.status(500).json({ reply: "자리를 비웠어요." }); }
};
