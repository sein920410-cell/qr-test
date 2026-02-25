// 기존 fetch 부분을 아래 코드로 정밀 교체하세요.
const imgResp = await fetch(s.signedUrl);
const arrayBuffer = await imgResp.arrayBuffer();
const b64 = Buffer.from(arrayBuffer).toString("base64");

const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [
      { inlineData: { mimeType: "image/jpeg", data: b64 } },
      { text: "정리 전문가 비서 '결'입니다. 사진 속 물건들을 [물품명(특징)] 형태로 꼼꼼하게 콤마(,)로만 구분해서 리스트업하세요. 인사말은 생략하고 결과만 나열해." }
    ]}]
  })
});
