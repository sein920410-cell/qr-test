import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { filePath } = req.body;

  try {
    const { data: s, error: sErr } = await supa.storage.from('user_uploads').createSignedUrl(filePath, 300);
    if (sErr || !s) throw new Error("이미지 주소 생성 실패");

    const imgResp = await fetch(s.signedUrl);
    const arrayBuffer = await imgResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");

    // [핵심] 모델명을 'latest'로 고정하여 404 에러 방지
    const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: b64 } },
          { text: "정리 전문가 비서 '결'입니다. 사진 속 물건들을 [물품명(특징)] 형태로 꼼꼼하게 콤마(,)로만 구분해서 리스트업하세요. 인사말은 생략하고 결과만 나열해." }
        ]}]
      })
    });

    const gData = await gResp.json();
    if (gData.error) throw new Error(gData.error.message);
    
    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const items = rawText.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
