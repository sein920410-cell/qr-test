import fetch from "node-fetch";

export default async function handler(req, res) {
  const { message, inventory, tag } = req.body;
  const MODEL = "gemini-1.5-flash";

  try {
    const prompt = `당신은 비서 '결'입니다. 태그: ${tag}. 현재 보관 중인 물품: ${inventory}. 질문: ${message}. 친절하고 간결하게 한국어로 답하세요.`;
    const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await gResp.json();
    const reply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "죄송해요, 다시 말씀해 주시겠어요?";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
