"use client";

import { useState } from "react";

type Work = {
  id: string;
  doi: string | null;
  title: string;
  publication_year: number | null;

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
};

export default function LiteraturePage() {

  const [query, setQuery] = useState("");

  const [results, setResults] = useState<Work[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function searchLiterature() {

    if (!query.trim()) {
      setError("请输入论文标题或关键词");
      return;
    }

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `/api/literature?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("搜索失败");
      }

      const data = await response.json();

      setResults(data.results || []);

    } catch (error) {

      console.error(error);

      setError("搜索文献时出现错误，请稍后重试。");

    } finally {

      setLoading(false);

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
          输入论文标题或科研关键词，搜索相关学术文献。
        </p>

      </div>

      <div className="mt-10 flex gap-3">

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchLiterature();
            }
          }}
          placeholder="例如：quantum machine learning"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-gray-500"
        />

        <button
          onClick={searchLiterature}
          disabled={loading}
          className="rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "搜索中..." : "搜索文献"}
        </button>

      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-10 space-y-5">

        {results.map((work) => {

          const authors = work.authorships
            ?.slice(0, 5)
            .map((item) => item.author.display_name)
            .join(", ");

          const journal =
            work.primary_location?.source?.display_name;

          return (
            <article
              key={work.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >

              <h2 className="text-lg font-semibold leading-7 text-gray-900">
                {work.title}
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                {authors || "作者信息暂无"}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">

                {work.publication_year && (
                  <span>
                    {work.publication_year}
                  </span>
                )}

                {journal && (
                  <span>
                    {journal}
                  </span>
                )}

              </div>

              {work.doi && (
                <a
                  href={work.doi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  查看 DOI →
                </a>
              )}

            </article>
          );
        })}

      </div>

    </main>
  );
}