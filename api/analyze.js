import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

// 환경 변수 로드
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
// 현재 한도 이슈가 있는 Gemini 3 Flash 대신, 안정적인 1.5 Flash를 기본값으로 권장합니다.
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; 

const supa = createClient(SUPA_URL, SUPA_SERVICE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: "파일 경로가 누락되었습니다." });

  try {
    // 1. Supabase Storage에서 사진의 보안 주소(Signed URL) 생성
    const { data: signedData, error: signErr } = await supa.storage
      .from('user_uploads')
      .createSignedUrl(filePath, 120);
    
    if (signErr) throw signErr;

    // 2. 이미지 데이터를 가져와서 Base64로 변환
    const imgResp = await fetch(signedData.signedUrl);
    const arrayBuffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    // 3. 제미나이 AI 분석 요청 (프롬프트 강화)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    
    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { 
              // 중요: inline_data가 아니라 inlineData여야 인식이 됩니다.
              inlineData: { 
                mimeType: "image/jpeg", 
                data: b64 
              } 
            },
            { 
              text: `당신은 대한민국 최고의 정리 전문가 비서 '결'입니다. 
              사진 속의 모든 물건을 아주 세밀하게 분석해서 리스트를 만들어주세요.
              
              [작성 규칙]
              1. 단순히 '양말'이라고 하지 말고 '스트라이프 양말', '흰색 면 양말'처럼 색상이나 특징을 포함하세요.
              2. 식별 가능한 모든 물건을 하나도 빠짐없이 찾아내세요.
              3. 결과는 오직 물품 명칭들만 콤마(,)로 구분해서 답변하세요.
              4. '알겠습니다' 같은 인사말이나 불필요한 설명은 절대 하지 마세요.
              
              예시: 검은색 키보드, 투명한 유리컵, 파란색 볼펜, 줄무늬 수건` 
            }
          ]
        }]
      })
    });

    const gData = await gResp.json();
    
    // API 에러 처리 (한도 초과 등)
    if (gData.error) {
      throw new Error(`AI 분석 에러: ${gData.error.message}`);
    }

    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 콤마로 구분된 텍스트를 배열로 변환하고 공백 제거
    const items = rawText.split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return res.status(200).json({ items });

  } catch (err) {
    console.error("Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
