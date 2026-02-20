// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const { message, inventory } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    // 결이의 성격과 지식을 주입하는 프롬프트
    const prompt = `당신은 사용자의 짐 정리를 도와주는 똑똑하고 친절한 비서 '결'입니다.
    현재 서랍의 물품 목록: [${inventory}]
    이 정보를 바탕으로 사용자의 질문에 답하세요. 목록에 없는 물건을 물어보면 없다고 정직하게 답하세요.
    질문: "${message}"`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply });
    } catch (err) {
        res.status(500).json({ reply: "비서 '결'이 잠시 자리를 비웠어요. 다시 시도해 주세요!" });
    }
}
