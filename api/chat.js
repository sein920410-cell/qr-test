// api/chat.js (수정본)
module.exports = async (req, res) => {
    const { message, inventory } = req.body;
    
    // API 키 확인 로그 (Vercel 로그에서 확인 가능)
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ reply: "서버 설정(API KEY)이 누락되었습니다." });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `당신은 비서 '결'입니다. 현재 보관함 물품 목록: ${inventory}. 사용자의 질문: ${message}. 친구처럼 친절하게 답변해주세요.` }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
        } else {
            // 구체적인 에러 원인 출력
            res.status(200).json({ reply: "결이가 내용을 이해하지 못했어요. (API 응답 오류)" });
        }
    } catch (err) {
        res.status(500).json({ reply: "연결망에 문제가 생겨서 결이가 잠시 자리를 비웠어요." });
    }
};
