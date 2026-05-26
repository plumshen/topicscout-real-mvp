exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "只支持 POST 请求" })
    };
  }

  const apiKey = process.env.ZHIPU_API_KEY;
  const model = process.env.ZHIPU_MODEL || "glm-4-flash";

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "服务器未配置 ZHIPU_API_KEY" })
    };
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "请求 JSON 格式错误" })
    };
  }

  const interest = String(input.interest || "").trim();

  if (!interest) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "请填写兴趣方向" })
    };
  }

  const prompt = `
你是一个研究方向探索助手。

用户信息：
兴趣方向：${interest}
研究阶段：${input.stage || "未说明"}
主要目标：${input.goal || "未说明"}
偏好方法：${input.method || "未说明"}
补充约束：${input.constraints || "无"}

请严格只输出 JSON，不要 Markdown，不要解释，不要代码块。

JSON 格式如下：
{
  "directions": [
    {
      "title": "方向名称",
      "fit": "适合什么研究",
      "stage": "适合阶段",
      "heat": "高/中/低",
      "feasibility": "高/中/低",
      "risk": "主要风险",
      "description": "方向解释，50字以内",
      "questions": ["问题1", "问题2"],
      "methods": ["方法1", "方法2"]
    }
  ],
  "keyword_paths": ["英文关键词1", "英文关键词2"],
  "advisor_brief": {
    "candidate_direction": "候选方向",
    "why_it_may_work": "为什么可行，50字以内",
    "questions_for_advisor": "建议问导师的问题，50字以内"
  },
  "search_plan": [
    {
      "query": "英文搜索词",
      "what_to_find": "查什么",
      "priority": "高",
      "note": "注意事项"
    }
  ]
}

要求：
1. directions 只给 1 个。
2. questions 只给 2 个。
3. methods 只给 2 个。
4. keyword_paths 只给 2 个。
5. search_plan 只给 1 个。
6. 所有内容尽量短。
`;

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "智谱 API 错误：" + raw.slice(0, 500)
        })
      };
    }

    let zhipuResult;
    try {
      zhipuResult = JSON.parse(raw);
    } catch (error) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "智谱返回内容不是 JSON：" + raw.slice(0, 500)
        })
      };
    }

    const outputText =
      zhipuResult &&
      zhipuResult.choices &&
      zhipuResult.choices[0] &&
      zhipuResult.choices[0].message &&
      zhipuResult.choices[0].message.content
        ? zhipuResult.choices[0].message.content
        : "";

    if (!outputText) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "智谱没有返回文本内容：" + raw.slice(0, 500)
        })
      };
    }

    const cleaned = outputText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (error) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "AI 输出不是有效 JSON：" + cleaned.slice(0, 500)
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "服务器错误：" + error.message
      })
    };
  }
};
