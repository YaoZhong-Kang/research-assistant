import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "服务器尚未配置 AI API Key" },
        { status: 500 }
      );
    }

    const body = await request.json();

    const title = body.title;
    const abstract = body.abstract;

    if (!title) {
      return NextResponse.json(
        { error: "缺少论文标题" },
        { status: 400 }
      );
    }

    if (!abstract) {
      return NextResponse.json(
        { error: "该文献没有可用摘要，暂时无法进行 AI 解读" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "deepseek-v4-flash",

      messages: [
        {
          role: "system",
          content: `
你是一名科研论文阅读辅助助手。

你的任务是帮助大学生快速理解论文，但必须严格基于用户提供的论文标题和摘要。

要求：
1. 不得编造摘要中没有出现的信息。
2. 如果某项信息无法从摘要判断，请明确写“摘要中未明确说明”。
3. 使用简洁、准确的中文。
4. 不要夸大论文结论。
5. 不要评价论文质量高低。
          `.trim(),
        },

        {
          role: "user",
          content: `
论文标题：
${title}

论文摘要：
${abstract}

请按照下面格式进行解读：

### 研究问题
说明这篇论文主要想解决什么问题。

### 研究方法
说明作者采用了什么主要方法。如果摘要没有明确描述，请指出。

### 主要结论
总结摘要中明确给出的主要结果。

### 研究意义
说明这项研究可能解决了什么问题或有什么价值，仅根据摘要判断。

### 一句话总结
用一句话帮助第一次接触该领域的大学生理解这篇论文。
          `.trim(),
        },
      ],
    });

    const result =
      completion.choices[0]?.message?.content ||
      "模型没有返回有效内容。";

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error("AI summary error:", error);

    return NextResponse.json(
      {
        error: "AI 解读失败，请稍后重试。",
      },
      {
        status: 500,
      }
    );
  }
}