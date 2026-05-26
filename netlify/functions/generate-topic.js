exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directions: [
        {
          title: "测试方向：AI 与学习行为",
          fit: "适合问卷或访谈",
          stage: "本科/硕士",
          heat: "测试",
          feasibility: "测试",
          risk: "这是测试结果，不是真实 AI 生成。",
          description: "如果你能看到这段内容，说明 Netlify Function 已经正常工作。",
          questions: ["测试问题1", "测试问题2"],
          methods: ["问卷", "访谈"]
        }
      ],
      keyword_paths: [
        "AI learning behavior",
        "AI literacy survey",
        "student use of ChatGPT"
      ],
      advisor_brief: {
        candidate_direction: "测试候选方向",
        why_it_may_work: "用于确认后端函数是否正常。",
        questions_for_advisor: "如果这个能显示，下一步再接智谱 API。"
      },
      search_plan: [
        {
          query: "AI learning behavior",
          what_to_find: "测试搜索建议",
          priority: "高",
          note: "这是测试数据。"
        }
      ]
    })
  };
};
