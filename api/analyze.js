// ... 앞부분 동일 ...
    const gResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: b64 } },
          { text: "당신은 정리 전문가 비서 '결'입니다. 사진 속 물건들을 아주 꼼꼼히 분석해서 [물품명(특징 포함)] 형태로 리스트업해줘. 예: '흰색 양말', '검은색 VR 헤드셋'. 불필요한 설명 없이 콤마(,)로만 구분해서 나열해." }
        ]}]
      })
    });
// ... 뒷부분 동일 ...
