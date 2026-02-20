// Vercel 환경에서 실행되는 서버리스 함수입니다.
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 1. POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl } = req.body;

  // 2. 이미지 URL이 없는 경우 에러 반환
  if (!imageUrl) {
    return res.status(400).json({ error: '이미지 경로가 없습니다.' });
  }

  try {
    // 3. Gemini API 초기화 (환경변수 GEMINI_API_KEY 필수)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 분석 속도가 가장 빠른 flash 모델을 사용합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. 안전 설정 해제 (분석 중 멈추는 현상 방지)
    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    // 5. 이미지를 읽어오기 위한 fetch
    const imageResp = await fetch(imageUrl);
    const buffer = await imageResp.arrayBuffer();

    // 6. 비서 '결'에게 내리는 직답형 명령 (10초 타임아웃 방지 핵심)
    const prompt = "List the items in this image separated by commas only. No descriptions. Answer in Korean.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType: "image/jpeg",
        },
      },
      { safetySettings }
    ]);

    const response = await result.response;
    const text = response.text();

    // 7. 성공 응답 전송
    return res.status(200).json({ items: text });

  } catch (error) {
    console.error("Gemini 분석 에러:", error);
    
    // "자리를 비웠어요" 대신 구체적인 에러 메시지 반환
    return res.status(500).json({ 
      error: `비서 '결'이 응답하지 못했습니다: ${error.message}`,
      details: error.stack 
    });
  }
}
