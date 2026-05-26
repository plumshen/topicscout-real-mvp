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
你是一个严谨的研究方向探索助手，服务对象是本科生、硕士生、博士早期学生或科研助理。
你的任务不是替用户决定选题，而是帮助用户把模糊兴趣拆成可研究、可检索、可和导师讨论的方向。

用户信息：
- 兴趣方向：${interest}
- 研究阶段：${input.stage || "未说明"}
- 主要目标：${input.goal || "未说明"}
- 偏好方法或资源：${input.method || "未说明"}
- 补充约束：${input.constraints || "无"}

请输出严格 JSON，不要 Markdown，不要代码块，不要额外解释。
JSON 结构必须为：
{
  "directions": [
    {
      "title": "方向名称，中文",
      "fit": "适合什么类型研究",
      "stage": "适合阶段",
      "heat": "高/中/低/上升中",
      "feasibility": "高/中高/中/低",
      "risk": "主要风险或限制",
      "description": "方向解释，80字以内",
      "questions": ["可研究问题1", "可研究问题2", "可研究问题3"],
      "methods": ["方法1", "方法2", "方法3"]
    }
  ],
  "keyword_paths": ["英文关键词组合1", "英文关键词组合2", "英文关键词组合3", "英文关键词组合4", "英文关键词组合5"],
  "advisor_brief": {
    "candidate_direction": "最值得优先讨论的候选方向",
    "why_it_may_work": "为什么这个方向对该用户可能可行",
    "questions_for_advisor": "建议向导师确认的问题，写成一小段"
  },
  "search_plan": [
    {
      "query": "英文搜索词",
      "what_to_find": "用这个词主要查什么",
      "priority": "高/中/低",
      "note": "注意事项"
    }
  ]
}

要求：
1. directions 给 3 个，不要太泛，要能变成论文或开题方向。
2. 每个方向都要写风险，不要只说好话。
3. keyword_paths 用英文，因为用户后续可能查 Google Scholar / Semantic Scholar。
4. 不要承诺一定能发论文或一定有前景。
5. 语言用中文，清晰、具体、克制。
`;

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `智谱 API 错误：${raw.slice(0, 500)}`
        })
      };
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(raw);
    } catch (error) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "智谱返回格式无法解析" })
      };
    }

    const outputText =
      parsedResponse?.choices?.[0]?.message?.content ||
      parsedResponse?.choices?.[0]?.delta?.content ||
      "";

    if (!outputText) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "智谱没有返回文本内容" })
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
          error: "AI 返回内容不是有效 JSON",
          raw: cleaned.slice(0, 1000)
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
        error: error.message || "服务器错误"
      })
    };
  }
};
