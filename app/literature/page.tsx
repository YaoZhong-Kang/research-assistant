"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  reconstructAbstract,
} from "@/lib/openalex";

type Work = {
  id: string;
  doi: string | null;

  title: string;

  publication_year: number | null;

  publication_date?: string | null;

  type?: string | null;

  type_crossref?: string | null;

  authorships: {
    author: {
      display_name: string;
    };
  }[];

  primary_location: {
    source: {
      display_name: string;
    } | null;
  } | null;

  abstract_inverted_index:
    | Record<string, number[]>
    | null;

  biblio: {
    volume: string | null;
    issue: string | null;
    first_page: string | null;
    last_page: string | null;
  };
};

export default function LiteraturePage() {

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<Work[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    expandedId,
    setExpandedId,
  ] = useState<string | null>(null);

  const [
    copiedText,
    setCopiedText,
  ] = useState("");

  const [
    aiLoadingId,
    setAiLoadingId,
  ] = useState<string | null>(null);

  const [
    aiResults,
    setAiResults,
  ] = useState<
    Record<string, string>
  >({});

  const [
    aiErrors,
    setAiErrors,
  ] = useState<
    Record<string, string>
  >({});


  async function searchLiterature() {

    if (!query.trim()) {

      setError(
        "请输入论文标题或关键词"
      );

      return;
    }

    setLoading(true);

    setError("");

    setExpandedId(null);

    try {

      const response =
        await fetch(
          `/api/literature?q=${encodeURIComponent(
            query
          )}`
        );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.error || `搜索失败 (${response.status})`
        );
      }

      const data =
        await response.json();

      setResults(
        data.results || []
      );

    } catch (error) {

      console.error(error);

      setError(
        "搜索文献时出现错误，请稍后重试。"
      );

    } finally {

      setLoading(false);
    }
  }


  function generateBibTeX(
    work: Work
  ) {

    const firstAuthor =
      work.authorships?.[0]
        ?.author
        ?.display_name ||
      "unknown";

    const lastName =
      firstAuthor
        .split(" ")
        .pop()
        ?.toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ""
        ) ||
      "unknown";

    const key =
      `${lastName}${
        work.publication_year ||
        ""
      }`;

    const authors =
      work.authorships
        .map(
          (item) =>
            item.author
              .display_name
        )
        .join(" and ");

    const journal =
      work.primary_location
        ?.source
        ?.display_name ||
      "";

    const volume =
      work.biblio?.volume ||
      "";

    const issue =
      work.biblio?.issue ||
      "";

    const pages =
      work.biblio?.first_page &&
      work.biblio?.last_page
        ? `${
            work.biblio
              .first_page
          }--${
            work.biblio
              .last_page
          }`
        : work.biblio
            ?.first_page ||
          "";

    return `@article{${key},
  title = {${work.title}},
  author = {${authors}},
  journal = {${journal}},
  year = {${
    work.publication_year ||
    ""
  }},
  volume = {${volume}},
  number = {${issue}},
  pages = {${pages}},
  doi = {${
    work.doi || ""
  }}
}`;
  }


  function formatGBTAuthor(
    name: string
  ) {

    const cleaned =
      name.trim();

    if (!cleaned) {
      return "";
    }

    // 如果数据已经是：
    // Vaswani, Ashish
    if (
      cleaned.includes(",")
    ) {

      const [
        surname,
        givenName = "",
      ] =
        cleaned.split(",");

      const initials =
        givenName
          .trim()
          .split(/\s+/)
          .map(
            (part) =>
              part[0]
                ?.toUpperCase()
          )
          .join("");

      return `${surname
        .trim()
        .toUpperCase()} ${initials}`;
    }

    const parts =
      cleaned.split(/\s+/);

    if (
      parts.length === 1
    ) {

      return parts[0];
    }

    const surname =
      parts[
        parts.length - 1
      ].toUpperCase();

    const givenNames =
      parts.slice(
        0,
        -1
      );

    const initials =
      givenNames
        .map(
          (part) =>
            part[0]
              ?.toUpperCase()
        )
        .join("");

    return `${surname} ${initials}`;
  }


  function generateAuthorsGBT(
    work: Work
  ) {

    const authors =
      work.authorships
        .slice(0, 3)
        .map(
          (item) =>
            formatGBTAuthor(
              item.author
                .display_name
            )
        )
        .filter(Boolean);

    let result =
      authors.join(", ");

    if (
      work.authorships
        .length > 3
    ) {

      result +=
        ", et al";
    }

    return result;
  }


  function generateGBT7714(
    work: Work
  ) {

    const authors =
      generateAuthorsGBT(
        work
      );

    const title =
      work.title;

    const source =
      work.primary_location
        ?.source
        ?.display_name ||
      "";

    const year =
      work.publication_year ||
      "";

    const volume =
      work.biblio?.volume ||
      "";

    const issue =
      work.biblio?.issue ||
      "";

    const firstPage =
      work.biblio
        ?.first_page ||
      "";

    const lastPage =
      work.biblio
        ?.last_page ||
      "";

    const pages =
      firstPage &&
      lastPage
        ? `${firstPage}-${lastPage}`
        : firstPage;

    const doi =
      work.doi
        ?.replace(
          "https://doi.org/",
          ""
        ) || "";

    const type = (
      work.type_crossref ||
      work.type ||
      ""
    ).toLowerCase();


    // 会议论文 —— 必须优先于 article 判断
  if (
    type.includes("proceeding") ||
    type.includes("conference")
  ) {
    let citation =
      `${authors}. ` +
      `${title}[C]//`;

    if (source) {
      citation += source;
    }

    if (year) {
      citation += `. ${year}`;
    }

    if (pages) {
      citation += `: ${pages}`;
    }

    citation += ".";

    return citation;
  }


  // 期刊论文
  if (
    type.includes("journal")
  ) {
    let citation =
      `${authors}. ` +
      `${title}[J].`;

    if (source) {
      citation += ` ${source}`;
    }

    if (year) {
      citation += `, ${year}`;
    }

    if (volume) {
      citation += `, ${volume}`;
    }

    if (issue) {
      citation += `(${issue})`;
    }

    if (pages) {
      citation += `: ${pages}`;
    }

    citation += ".";

    return citation;
  }


    // 学位论文
    if (
      type.includes(
        "dissertation"
      ) ||
      type.includes(
        "thesis"
      )
    ) {

      return (
        `${authors}. ` +
        `${title}[D]. ` +
        `${year}.`
      );
    }


    // 图书
    if (
      type === "book"
    ) {

      let citation =
        `${authors}. ` +
        `${title}[M].`;

      if (source) {
        citation +=
          ` ${source},`;
      }

      if (year) {
        citation +=
          ` ${year}`;
      }

      citation += ".";

      return citation;
    }


    // 图书章节
    if (
      type.includes(
        "book-chapter"
      ) ||
      type.includes(
        "book chapter"
      )
    ) {

      let citation =
        `${authors}. ` +
        `${title}[M]//`;

      if (source) {
        citation +=
          `${source}`;
      }

      if (year) {
        citation +=
          `. ${year}`;
      }

      if (pages) {
        citation +=
          `: ${pages}`;
      }

      citation += ".";

      return citation;
    }


    // 预印本 / 在线文献
    if (
      type.includes(
        "preprint"
      ) ||
      type.includes(
        "posted"
      )
    ) {

      let citation =
        `${authors}. ` +
        `${title}[EB/OL].`;

      if (year) {
        citation +=
          ` ${year}.`;
      }

      if (doi) {
        citation +=
          ` DOI:${doi}.`;
      }

      return citation;
    }


    // 未知类型
    let citation =
      `${authors}. ` +
      `${title}[Z].`;

    if (source) {
      citation +=
        ` ${source},`;
    }

    if (year) {
      citation +=
        ` ${year}`;
    }

    citation += ".";

    return citation;
  }


  async function copyText(
    text: string,
    label: string
  ) {

    try {

      await navigator
        .clipboard
        .writeText(text);

      setCopiedText(label);

      setTimeout(
        () => {
          setCopiedText("");
        },
        1500
      );

    } catch (error) {

      console.error(error);

      setError(
        "复制失败，请手动复制。"
      );
    }
  }


  async function analyzeWithAI(
    work: Work,
    abstract: string
  ) {

    if (!abstract) {

      setAiErrors(
        (prev) => ({
          ...prev,

          [work.id]:
            "该文献暂无摘要，无法进行 AI 解读。",
        })
      );

      return;
    }

    setAiLoadingId(
      work.id
    );

    setAiErrors(
      (prev) => ({
        ...prev,

        [work.id]: "",
      })
    );

    try {

      const response =
        await fetch(
          "/api/ai-summary",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  work.title,

                abstract,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.error ||
            "AI 解读失败"
        );
      }

      setAiResults(
        (prev) => ({
          ...prev,

          [work.id]:
            data.result,
        })
      );

    } catch (error) {

      console.error(error);

      setAiErrors(
        (prev) => ({
          ...prev,

          [work.id]:
            error instanceof
            Error
              ? error.message
              : "AI 解读失败，请稍后重试。",
        })
      );

    } finally {

      setAiLoadingId(null);
    }
  }


  return (
    <main className="mx-auto max-w-5xl px-6 py-16">

      <div className="max-w-2xl">

        <p className="text-sm font-medium text-gray-500">
          Literature Assistant
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          文献助手
        </h1>

        <p className="mt-4 leading-7 text-gray-600">
          输入论文标题、科研关键词或 DOI，搜索相关文献，并快速查看摘要、引用格式与 AI 解读。
        </p>

      </div>


      <div className="mt-10 flex gap-3">

        <input
          type="text"

          value={query}

          onChange={(
            event
          ) =>
            setQuery(
              event.target
                .value
            )
          }

          onKeyDown={(
            event
          ) => {

            if (
              event.key ===
              "Enter"
            ) {

              searchLiterature();
            }
          }}

          placeholder="输入论文标题、关键词或 DOI，例如：Attention Is All You Need，或者10.1109/CVPR.2016.90"

          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-gray-500"
        />


        <button
          onClick={
            searchLiterature
          }

          disabled={loading}

          className="rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "搜索中..."
            : "搜索文献"}
        </button>

      </div>


      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}


      {results.length >
        0 && (
        <p className="mt-8 text-sm text-gray-500">
          找到{" "}
          {
            results.length
          }{" "}
          条结果
        </p>
      )}


      <div className="mt-6 space-y-5">

        {results.map(
          (work) => {

            const authors =
              work.authorships
                ?.slice(
                  0,
                  5
                )
                .map(
                  (
                    item
                  ) =>
                    item.author
                      .display_name
                )
                .join(", ");


            const journal =
              work
                .primary_location
                ?.source
                ?.display_name;


            const abstract =
              reconstructAbstract(
                work.abstract_inverted_index
              );


            const isExpanded =
              expandedId ===
              work.id;


            const bibtex =
              generateBibTeX(
                work
              );


            const gbt =
              generateGBT7714(
                work
              );


            return (
              <article
                key={
                  work.id
                }

                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >

                <h2 className="text-lg font-semibold leading-7 text-gray-900">
                  {
                    work.title
                  }
                </h2>


                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {authors ||
                    "作者信息暂无"}
                </p>


                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">

                  {work.publication_year && (
                    <span>
                      {
                        work.publication_year
                      }
                    </span>
                  )}


                  {journal && (
                    <span>
                      {
                        journal
                      }
                    </span>
                  )}

                </div>


                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      setExpandedId(
                        isExpanded
                          ? null
                          : work.id
                      )
                    }

                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {isExpanded
                      ? "收起摘要"
                      : "查看摘要"}
                  </button>


                  {work.doi && (
                    <button
                      onClick={() =>
                        copyText(
                          work.doi!,
                          `${work.id}-doi`
                        )
                      }

                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      {copiedText ===
                      `${work.id}-doi`
                        ? "已复制"
                        : "复制 DOI"}
                    </button>
                  )}


                  <button
                    onClick={() =>
                      copyText(
                        bibtex,
                        `${work.id}-bibtex`
                      )
                    }

                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {copiedText ===
                    `${work.id}-bibtex`
                      ? "已复制"
                      : "复制 BibTeX"}
                  </button>


                  <button
                    onClick={() =>
                      analyzeWithAI(
                        work,
                        abstract
                      )
                    }

                    disabled={
                      aiLoadingId ===
                      work.id
                    }

                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoadingId ===
                    work.id
                      ? "AI 解读中..."
                      : "✨ AI 解读"}
                  </button>


                  <button
                    onClick={() =>
                      copyText(
                        gbt,
                        `${work.id}-gbt`
                      )
                    }

                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {copiedText ===
                    `${work.id}-gbt`
                      ? "已复制"
                      : "复制 GB/T 7714"}
                  </button>


                  {work.doi && (
                    <a
                      href={
                        work.doi
                      }

                      target="_blank"

                      rel="noopener noreferrer"

                      className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      打开 DOI →
                    </a>
                  )}

                </div>


                {isExpanded && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-5">

                    <p className="text-sm font-medium text-gray-900">
                      摘要
                    </p>

                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {abstract ||
                        "该文献暂无可用摘要。"}
                    </p>

                  </div>
                )}


                {aiErrors[
                  work.id
                ] && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">

                    <p className="text-sm text-red-700">
                      {
                        aiErrors[
                          work.id
                        ]
                      }
                    </p>

                  </div>
                )}


                {aiResults[
                  work.id
                ] && (

                  <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">

                    <div className="flex items-center justify-between">

                      <p className="font-semibold text-gray-900">
                        ✨ AI 文献解读
                      </p>


                      <button
                        onClick={() =>
                          copyText(
                            aiResults[
                              work.id
                            ],
                            `${work.id}-ai`
                          )
                        }

                        className="text-sm text-gray-500 hover:text-gray-900"
                      >
                        {copiedText ===
                        `${work.id}-ai`
                          ? "已复制"
                          : "复制结果"}
                      </button>

                    </div>


                    <div className="mt-5 text-sm leading-7 text-gray-700">

                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}

                        components={{
                          h1: ({
                            children,
                          }) => (
                            <h3 className="mb-3 mt-6 text-lg font-semibold text-gray-900">
                              {
                                children
                              }
                            </h3>
                          ),

                          h2: ({
                            children,
                          }) => (
                            <h3 className="mb-3 mt-6 text-lg font-semibold text-gray-900">
                              {
                                children
                              }
                            </h3>
                          ),

                          h3: ({
                            children,
                          }) => (
                            <h3 className="mb-2 mt-5 font-semibold text-gray-900">
                              {
                                children
                              }
                            </h3>
                          ),

                          p: ({
                            children,
                          }) => (
                            <p className="my-2 leading-7">
                              {
                                children
                              }
                            </p>
                          ),

                          ul: ({
                            children,
                          }) => (
                            <ul className="my-3 list-disc space-y-1 pl-6">
                              {
                                children
                              }
                            </ul>
                          ),

                          ol: ({
                            children,
                          }) => (
                            <ol className="my-3 list-decimal space-y-1 pl-6">
                              {
                                children
                              }
                            </ol>
                          ),

                          li: ({
                            children,
                          }) => (
                            <li>
                              {
                                children
                              }
                            </li>
                          ),

                          strong: ({
                            children,
                          }) => (
                            <strong className="font-semibold text-gray-900">
                              {
                                children
                              }
                            </strong>
                          ),
                        }}
                      >
                        {
                          aiResults[
                            work.id
                          ]
                        }
                      </ReactMarkdown>

                    </div>


                    <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-400">
                      AI 解读仅基于当前文献标题和摘要生成，请结合论文原文核实关键信息。
                    </p>

                  </div>
                )}

              </article>
            );
          }
        )}

      </div>

    </main>
  );
}