import fetch from "node-fetch";

export default async function handler(req, res) {
  const { message, inventory, tag } = req.body;
  try {
    const prompt = `비서 '결'로서 답변하세요. 위치: ${tag}. 현재 물품: ${inventory}. 질문: ${message}`;
    
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const gData = await gResp.json();
    return res.status(200).json({ reply: gData?.candidates?.[0]?.content?.parts?.[0]?.text || "이해하지 못했어요." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
