# TopicScout AI Real MVP

这是一个 Netlify Functions 版本的 TopicScout AI。

## 功能
- 前端：index.html
- 后端：netlify/functions/generate-topic.js
- AI：调用 OpenAI Responses API
- 环境变量：OPENAI_API_KEY

## 部署后需要设置
在 Netlify 后台：
Site configuration → Environment variables → Add variable

Name:
OPENAI_API_KEY

Value:
你的 OpenAI API Key

可选：
OPENAI_MODEL = gpt-5.4-mini
