import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  checkAiRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        {
          error: "服务器尚未配置 AI API Key",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const text =
      typeof body.text === "string"
        ? body.text.trim()
        : "";

    if (!text) {
      return NextResponse.json(
        {
          error: "请提供需要分析的论文文本",
        },
        {
          status: 400,
        }
      );
    }

    // 第一版限制长度，避免误粘整篇论文导致费用和响应时间过高
    if (text.length > 12000) {
      return NextResponse.json(
        {
          error:
            "当前一次最多分析约 12000 个字符，请分段提交。",
        },
        {
          status: 400,
        }
      );
    }

    const ip =
        getClientIp(
            request
        );

        const rateLimit =
        checkAiRateLimit(
            ip
        );


        if (
        !rateLimit.allowed
        ) {

        const response =
            NextResponse.json(
            {
                error:
                `AI 请求过于频繁，请约 ${rateLimit.retryAfterSeconds} 秒后再试。`,
            },
            {
                status: 429,
            }
            );

        response.headers.set(
            "Retry-After",
            String(
            rateLimit.retryAfterSeconds
            )
        );

        return response;
        }

    const completion =
      await client.chat.completions.create({
        model: "deepseek-v4-flash",

        temperature: 0.2,

        messages: [
          {
            role: "system",
            content: `
你是一名科研论文写作辅助助手。

你的任务不是替用户代写论文，而是检查用户提供文本中的学术表达问题。

必须遵守以下规则：

1. 只能分析用户实际提供的文本，不得虚构不存在的原句。
2. 不评价研究成果本身是否正确，只分析表达方式。
3. 不改变原文中的实验数据、数值、公式、结论含义和专业术语。
4. 不擅自补充原文没有提供的科研事实。
5. 如果某句话本身没有明显问题，不要为了凑数量强行提出修改。
6. 修改建议应尽量局部、克制，不要整段重写。
7. 使用中文回答。
8. 最多列出 8 个最值得修改的问题。
9. 如果多个问题属于同一类且内容重复，可以合并说明。
10. 优先指出影响学术严谨性和逻辑表达的问题，不必穷举所有轻微问题。

重点检查：

- 口语化或非正式表达
- 主观、夸张或缺乏证据支撑的措辞
- 逻辑连接不清楚
- 指代不明确
- 重复、冗余表达
- 结论范围超过当前表述能够支持的程度
- 学术语气不够客观

输出必须使用 Markdown，并严格按照下面结构：

## 总体评价

用 2～4 句话说明这段文字整体的学术表达情况。

## 具体问题

如果存在问题，每个问题使用以下格式：

### 问题 1：问题类别

**原文片段：**
引用用户原文中的短句或局部表达。

**问题说明：**
说明为什么这一表达值得修改。

**修改建议：**
给出一个更规范、更客观的建议表达。

继续列出问题 2、问题 3……

如果没有明显问题，请直接写：
“未发现明显的学术表达问题。”

## 使用提醒

说明以上建议仅针对语言与表达，不能替代导师、期刊或学科规范要求。
            `.trim(),
          },

          {
            role: "user",
            content: `
请分析下面这段科研论文文本的学术表达：

${text}
            `.trim(),
          },
        ],
      });

    const result =
      completion.choices[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        {
          error: "AI 未返回有效分析结果",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      result,
    });
  } catch (error: any) {
    console.error(
      "Writing AI error:",
      error
    );

    if (error?.status === 402) {
      return NextResponse.json(
        {
          error:
            "AI 服务余额不足，请联系管理员充值后重试。",
        },
        {
          status: 402,
        }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        {
          error:
            "AI 请求过于频繁，请稍后重试。",
        },
        {
          status: 429,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "AI 学术表达分析失败，请稍后重试。",
      },
      {
        status: 500,
      }
    );
  }
}