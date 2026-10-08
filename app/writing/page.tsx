"use client";

import {
  useMemo,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  analyzeWriting,
} from "@/lib/writing-utils";

const writingExample = `实验在20C条件下进行，气体流速为3m/s。实验结果显示,SEM具有非常明显的优势。我们的方法效果非常好，并且显然优于所有现有方法。图1展示了实验结果，图3给出了进一步分析。已有研究[1][2][4]支持该观点，因此我们认为该方法能够解决这一领域的大部分问题。`;

export default function WritingPage() {
  const [text, setText] =
    useState("");

  const [checked, setChecked] =
    useState(false);
  
  const [
    aiLoading,
    setAiLoading,
  ] = useState(false);

  const [
    aiResult,
    setAiResult,
  ] = useState("");

  const [
    aiError,
    setAiError,
  ] = useState("");

  const issues = useMemo(() => {
    if (!checked) {
      return [];
    }

    return analyzeWriting(text);
  }, [text, checked]);

  function runCheck() {
    setChecked(true);
  }

  async function runAIAnalysis() {
    if (!text.trim()) {
      setAiError(
        "请先输入需要分析的论文文本。"
      );

      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult("");

    try {
      const response =
        await fetch(
          "/api/writing-ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              text,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "AI 分析失败"
        );
      }

      setAiResult(
        data.result
      );
    } catch (error) {
      console.error(error);

      setAiError(
        error instanceof Error
          ? error.message
          : "AI 学术表达分析失败，请稍后重试。"
      );
    } finally {
      setAiLoading(false);
    }
  }

  function clearText() {
    setText("");
    setChecked(false);

    setAiResult("");
    setAiError("");
    setAiLoading(false);
  }

  function loadWritingExample() {

    setText(
      writingExample
    );

    setChecked(
      true
    );

    setAiResult("");

    setAiError("");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">

      <div className="max-w-2xl">
        <p className="text-sm font-medium text-gray-500">
          Writing Assistant
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          论文规范助手
        </h1>

        <p className="mt-4 leading-7 text-gray-600">
          粘贴论文文本，检查单位格式、
          中英文标点、图表编号、参考文献编号
          及常见缩写规范。
        </p>
      </div>

      <section className="mt-10">

       <textarea
          value={text}
          maxLength={12000}
          onChange={(event) => {
            setText(event.target.value);

            setChecked(false);

            setAiResult("");
            setAiError("");
          }}
          placeholder="请粘贴需要检查的论文正文..."
          className="min-h-[320px] w-full rounded-2xl border border-gray-300 bg-white p-5 text-sm leading-7 outline-none transition focus:border-gray-500"
        />

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            建议分段分析论文内容，以提高 AI 分析准确性。
          </p>

          <p
            className={`text-xs ${
              text.length > 11000
                ? "text-amber-600"
                : "text-gray-400"
            }`}
          >
            {text.length} / 12000
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">

          <button
            onClick={runCheck}
            disabled={!text.trim()}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            开始检查
          </button>

          <button
            onClick={
              runAIAnalysis
            }

            disabled={
              !text.trim() ||
              aiLoading
            }

            className="rounded-xl border border-gray-900 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiLoading
              ? "AI 分析中..."
              : "✨ AI 学术表达分析"}
          </button>

          <button
            onClick={
              loadWritingExample
            }
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ✨ 载入示例文本
          </button>
          
          <button
            onClick={clearText}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            清空文本
          </button>

        </div>

      </section>

      {aiError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {aiError}
          </p>
        </div>
      )}

      {checked && (
        <section className="mt-12">

          <div className="grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">
                字符数
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {text.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">
                检测问题
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {issues.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">
                检查状态
              </p>

              <p className="mt-2 text-lg font-semibold">
                {issues.length === 0
                  ? "未发现明显问题"
                  : "建议人工复核"}
              </p>
            </div>

          </div>

          <div className="mt-10">

            <h2 className="text-xl font-semibold text-gray-900">
              检查结果
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              以下结果基于规则自动检测，
              请结合学校、期刊或导师要求进行判断。
            </p>

            {issues.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm text-green-700">
                  当前未发现明显的格式规范问题。
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">

                {issues.map(
                  (issue, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-gray-200 bg-white p-5"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {issue.type}
                        </span>

                      </div>

                      <p className="mt-4 text-sm leading-7 text-gray-800">
                        {issue.message}
                      </p>

                      {issue.original && (
                        <div className="mt-3 text-sm text-gray-500">
                          原始内容：
                          <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-gray-800">
                            {issue.original}
                          </code>
                        </div>
                      )}

                      {issue.suggestion && (
                        <div className="mt-3 text-sm text-gray-500">
                          建议：
                          <code className="ml-2 rounded bg-green-50 px-2 py-1 text-green-700">
                            {issue.suggestion}
                          </code>
                        </div>
                      )}

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </section>
      )}

      {aiResult && (
        <section className="mt-12">

          <div className="flex items-center justify-between gap-4">

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ✨ AI 学术表达分析
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                AI 仅分析语言表达，不判断科研结论本身是否正确。
              </p>
            </div>


            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    aiResult
                  );
                } catch (error) {
                  console.error(
                    error
                  );
                }
              }}

              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              复制分析结果
            </button>

          </div>


          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">

            <div className="text-sm leading-7 text-gray-700">

              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                ]}

                components={{
                  h1: ({
                    children,
                  }) => (
                    <h3 className="mb-3 mt-6 text-lg font-semibold text-gray-900">
                      {children}
                    </h3>
                  ),

                  h2: ({
                    children,
                  }) => (
                    <h3 className="mb-3 mt-6 text-lg font-semibold text-gray-900">
                      {children}
                    </h3>
                  ),

                  h3: ({
                    children,
                  }) => (
                    <h4 className="mb-2 mt-5 font-semibold text-gray-900">
                      {children}
                    </h4>
                  ),

                  p: ({
                    children,
                  }) => (
                    <p className="my-2 leading-7">
                      {children}
                    </p>
                  ),

                  ul: ({
                    children,
                  }) => (
                    <ul className="my-3 list-disc space-y-1 pl-6">
                      {children}
                    </ul>
                  ),

                  ol: ({
                    children,
                  }) => (
                    <ol className="my-3 list-decimal space-y-1 pl-6">
                      {children}
                    </ol>
                  ),

                  li: ({
                    children,
                  }) => (
                    <li>
                      {children}
                    </li>
                  ),

                  strong: ({
                    children,
                  }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                }}
              >
                {aiResult}
              </ReactMarkdown>

            </div>


            <div className="mt-6 border-t border-gray-100 pt-4">

              <p className="text-xs leading-5 text-gray-400">
                AI 建议仅供科研写作辅助参考。
                请以导师意见、学校规范和目标期刊要求为准；
                请勿在未核对的情况下直接采用 AI 修改内容。
              </p>

            </div>

          </div>

        </section>
      )}

    </main>
  );
}